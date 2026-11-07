import { Router } from 'express';
import { z } from 'zod';
import { config } from '../config.js';
import { query } from '../db.js';
import { requireAuth, requireDevice } from '../auth.js';
import { getSettings } from '../settings.js';
import { saveSelfie } from '../storage.js';
import {
  asyncH,
  currentMonth,
  daysBetween,
  DATE_RE,
  haversine,
  HttpError,
  MONTH_RE,
  monthRange,
  roundQuarter,
  suggestHours,
  todayStr,
  validate,
} from '../utils.js';

const router = Router();
router.use(requireAuth('employee'));

const ATT_COLS = `id, work_date, check_in_at, check_out_at, in_distance_m, out_distance_m,
  worked_minutes, suggested_hours, approved_hours, status`;

/** Lists the app needs: kinds of work, suggested items and workshop rules. */
router.get(
  '/meta',
  asyncH(async (_req, res) => {
    const s = await getSettings();
    const tasks = await query('select name from task_types where active order by id');
    const items = await query('select name from work_items where active order by name');
    res.json({
      companyName: s.companyName,
      timezone: config.timezone,
      radiusM: s.radiusM,
      workshopSet: Boolean(s.workshopLat || s.workshopLng),
      taskTypes: tasks.rows.map((r) => r.name),
      items: items.rows.map((r) => r.name),
    });
  }),
);

router.get(
  '/today',
  asyncH(async (req, res) => {
    const today = todayStr();
    const id = req.emp.id;
    const att = await query(`select ${ATT_COLS} from attendance where employee_id = $1 and work_date = $2`, [
      id,
      today,
    ]);
    const leave = await query(
      `select 1 from leave_requests
        where employee_id = $1 and status = 'approved' and from_date <= $2 and to_date >= $2`,
      [id, today],
    );
    const work = await query(
      `select id, task_type, item, hours, note from work_entries
        where employee_id = $1 and work_date = $2 order by created_at`,
      [id, today],
    );
    const recent = await query(
      `select work_date, sum(hours)::float as hours, array_agg(distinct task_type) as tasks
         from work_entries
        where employee_id = $1 and work_date < $2
        group by work_date order by work_date desc limit 5`,
      [id, today],
    );
    res.json({
      today,
      employee: { name: req.emp.name, code: req.emp.code, roleTitle: req.emp.role_title, hourlyRate: req.emp.hourly_rate },
      attendance: att.rows[0] || null,
      onLeave: leave.rowCount > 0,
      work: work.rows,
      recent: recent.rows,
    });
  }),
);

router.get(
  '/attendance',
  asyncH(async (req, res) => {
    const month = String(req.query.month || currentMonth());
    if (!MONTH_RE.test(month)) throw new HttpError(400, 'month must look like 2026-10', 'VALIDATION');
    const { from, next } = monthRange(month);
    const { rows } = await query(
      `select ${ATT_COLS}, approved_rate from attendance
        where employee_id = $1 and work_date >= $2 and work_date < $3 order by work_date desc`,
      [req.emp.id, from, next],
    );
    let approvedHours = 0;
    let pendingHours = 0;
    let payable = 0;
    for (const r of rows) {
      if (r.status === 'approved') {
        approvedHours += r.approved_hours;
        payable += r.approved_hours * r.approved_rate;
      } else if (r.status === 'pending') {
        pendingHours += r.suggested_hours || 0;
      }
    }
    res.json({
      month,
      rows,
      totals: {
        days: rows.filter((r) => r.status !== 'rejected').length,
        approvedHours,
        pendingHours,
        payable: Math.round(payable * 100) / 100,
        hourlyRate: req.emp.hourly_rate,
      },
    });
  }),
);

// ---------- Check in / check out (company mobile only) ----------

const punchSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  accuracy: z.number().min(0).max(100000).optional(),
  selfie: z.string().max(450000),
});

function parseSelfie(dataUrl) {
  const m = /^data:image\/jpeg;base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl);
  if (!m) throw new HttpError(400, 'Take a selfie with the camera first.', 'BAD_SELFIE');
  const buf = Buffer.from(m[1], 'base64');
  const isJpeg = buf.length > 2000 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff;
  if (!isJpeg || buf.length > 300000) {
    throw new HttpError(400, 'The selfie is not a valid photo. Please take it again.', 'BAD_SELFIE');
  }
  return buf;
}

/** Check the location and selfie sent with a punch. */
async function verifyPunch(body) {
  const data = validate(punchSchema, body);
  const s = await getSettings();
  if (!s.workshopLat && !s.workshopLng) {
    throw new HttpError(409, 'The workshop location is not set yet. Ask the admin to set it in Settings.', 'LOCATION_NOT_SET');
  }
  if (data.accuracy != null && data.accuracy > 150) {
    throw new HttpError(422, `GPS signal is weak (about ${Math.round(data.accuracy)} m). Move to an open area and try again.`, 'GPS_WEAK');
  }
  const dist = haversine(data.lat, data.lng, s.workshopLat, s.workshopLng);
  if (dist > s.radiusM) {
    throw new HttpError(403, `You are ${dist} m from the workshop. Move within ${s.radiusM} m to mark attendance.`, 'OUT_OF_RANGE');
  }
  return { data, settings: s, dist, selfie: parseSelfie(data.selfie) };
}

router.post(
  '/check-in',
  requireDevice,
  asyncH(async (req, res) => {
    const id = req.emp.id;
    const today = todayStr();
    const leave = await query(
      `select 1 from leave_requests
        where employee_id = $1 and status = 'approved' and from_date <= $2 and to_date >= $2`,
      [id, today],
    );
    if (leave.rowCount) throw new HttpError(409, 'You are on approved leave today.', 'ON_LEAVE');
    const existing = await query('select 1 from attendance where employee_id = $1 and work_date = $2', [id, today]);
    if (existing.rowCount) throw new HttpError(409, 'You have already checked in today.', 'ALREADY_CHECKED_IN');

    const { data, dist, selfie } = await verifyPunch(req.body);
    const path = `${id}/${today}-in.jpg`;
    await saveSelfie(path, selfie);
    try {
      const { rows } = await query(
        `insert into attendance
           (employee_id, work_date, check_in_at, in_lat, in_lng, in_distance_m, in_selfie_path, device_id, status)
         values ($1, $2, now(), $3, $4, $5, $6, $7, 'open')
         returning ${ATT_COLS}`,
        [id, today, data.lat, data.lng, dist, path, req.device.id],
      );
      res.status(201).json({ attendance: rows[0] });
    } catch (err) {
      if (err.code === '23505') throw new HttpError(409, 'You have already checked in today.', 'ALREADY_CHECKED_IN');
      throw err;
    }
  }),
);

router.post(
  '/check-out',
  requireDevice,
  asyncH(async (req, res) => {
    const id = req.emp.id;
    const today = todayStr();
    const open = await query(
      'select id, check_in_at from attendance where employee_id = $1 and work_date = $2 and check_out_at is null',
      [id, today],
    );
    if (!open.rows[0]) throw new HttpError(409, 'There is no open check-in for today.', 'NOT_CHECKED_IN');

    const { data, settings, dist, selfie } = await verifyPunch(req.body);
    const path = `${id}/${today}-out.jpg`;
    await saveSelfie(path, selfie);

    const minutes = Math.max(0, Math.floor((Date.now() - new Date(open.rows[0].check_in_at).getTime()) / 60000));
    const hours = suggestHours(minutes, settings);
    const { rows } = await query(
      `update attendance
          set check_out_at = now(), out_lat = $2, out_lng = $3, out_distance_m = $4, out_selfie_path = $5,
              worked_minutes = $6, suggested_hours = $7, status = 'pending'
        where id = $1
        returning ${ATT_COLS}`,
      [open.rows[0].id, data.lat, data.lng, dist, path, minutes, hours],
    );
    res.json({ attendance: rows[0] });
  }),
);

// ---------- Daily work log ----------

const workSchema = z.object({
  task_type: z.string().trim().min(1).max(40),
  item: z.string().trim().min(1, 'Add the item or order you worked on').max(80),
  hours: z.number().min(0.25).max(12),
  note: z.string().trim().max(100).optional().default(''),
});

router.post(
  '/work',
  asyncH(async (req, res) => {
    const data = validate(workSchema, req.body);
    const today = todayStr();
    const id = req.emp.id;
    const att = await query('select 1 from attendance where employee_id = $1 and work_date = $2', [id, today]);
    if (!att.rowCount) throw new HttpError(409, 'Check in first. You can add work only on days you are present.', 'NOT_CHECKED_IN');
    const type = await query('select 1 from task_types where active and name = $1', [data.task_type]);
    if (!type.rowCount) throw new HttpError(400, 'Choose a kind of work from the list.', 'VALIDATION');
    const hours = roundQuarter(data.hours);
    const sum = await query('select coalesce(sum(hours), 0)::float as h from work_entries where employee_id = $1 and work_date = $2', [id, today]);
    if (sum.rows[0].h + hours > 16) throw new HttpError(400, 'A day cannot have more than 16 hours of work.', 'VALIDATION');
    const { rows } = await query(
      `insert into work_entries (employee_id, work_date, task_type, item, hours, note)
       values ($1, $2, $3, $4, $5, $6) returning id, task_type, item, hours, note`,
      [id, today, data.task_type, data.item, hours, data.note],
    );
    res.status(201).json({ entry: rows[0] });
  }),
);

router.delete(
  '/work/:id',
  asyncH(async (req, res) => {
    const entryId = validate(z.string().uuid(), req.params.id);
    const r = await query(
      'delete from work_entries where id = $1 and employee_id = $2 and work_date = $3',
      [entryId, req.emp.id, todayStr()],
    );
    if (!r.rowCount) throw new HttpError(404, 'Entry not found. Only today’s entries can be removed.', 'NOT_FOUND');
    res.json({ ok: true });
  }),
);

// ---------- Leave ----------

router.get(
  '/leave',
  asyncH(async (req, res) => {
    const { rows } = await query(
      `select id, leave_type, from_date, to_date, reason, status, created_at
         from leave_requests where employee_id = $1 order by from_date desc limit 50`,
      [req.emp.id],
    );
    res.json({ requests: rows });
  }),
);

const leaveSchema = z.object({
  leave_type: z.enum(['Casual', 'Sick', 'Unpaid']),
  from_date: z.string().regex(DATE_RE),
  to_date: z.string().regex(DATE_RE),
  reason: z.string().trim().min(3, 'Add a short reason').max(200),
});

router.post(
  '/leave',
  asyncH(async (req, res) => {
    const d = validate(leaveSchema, req.body);
    const today = todayStr();
    if (d.from_date < today) throw new HttpError(400, 'Leave cannot start in the past.', 'VALIDATION');
    if (d.to_date < d.from_date) throw new HttpError(400, 'The end date cannot be before the start date.', 'VALIDATION');
    if (daysBetween(d.from_date, d.to_date) > 31) throw new HttpError(400, 'A request can cover at most 31 days.', 'VALIDATION');
    const overlap = await query(
      `select 1 from leave_requests
        where employee_id = $1 and status in ('pending','approved') and from_date <= $3 and to_date >= $2`,
      [req.emp.id, d.from_date, d.to_date],
    );
    if (overlap.rowCount) throw new HttpError(409, 'You already have a leave request for these dates.', 'OVERLAP');
    const { rows } = await query(
      `insert into leave_requests (employee_id, leave_type, from_date, to_date, reason)
       values ($1, $2, $3, $4, $5) returning id, leave_type, from_date, to_date, reason, status`,
      [req.emp.id, d.leave_type, d.from_date, d.to_date, d.reason],
    );
    res.status(201).json({ request: rows[0] });
  }),
);

export default router;
