import crypto from 'node:crypto';
import { Router } from 'express';
import { z } from 'zod';
import { query } from '../db.js';
import { hashPin, requireAuth, sha256 } from '../auth.js';
import { getSettings, saveSettings } from '../settings.js';
import { readSelfie } from '../storage.js';
import {
  asyncH,
  csvEscape,
  currentMonth,
  DATE_RE,
  HttpError,
  MONTH_RE,
  monthRange,
  roundQuarter,
  todayStr,
  validate,
} from '../utils.js';

const router = Router();
router.use(requireAuth('admin'));

const uuid = z.string().uuid();
const pinSchema = z.string().regex(/^\d{4,6}$/, 'PIN must be 4 to 6 digits');

// ---------- Overview ----------

router.get(
  '/overview',
  asyncH(async (_req, res) => {
    const today = todayStr();
    const { from, next } = monthRange(currentMonth());
    const employees = await query(
      `select e.id, e.code, e.name, e.role_title,
              a.status as attendance_status, a.check_in_at, a.check_out_at, a.in_distance_m, a.id as attendance_id,
              exists (select 1 from leave_requests l
                       where l.employee_id = e.id and l.status = 'approved'
                         and l.from_date <= $1 and l.to_date >= $1) as on_leave
         from employees e
         left join attendance a on a.employee_id = e.id and a.work_date = $1
        where e.active order by e.name`,
      [today],
    );
    const counts = await query(
      `select
         (select count(*)::int from attendance where status = 'pending') as pending_hours,
         (select count(*)::int from attendance where status = 'open' and work_date < $1) as stale_open,
         (select count(*)::int from leave_requests where status = 'pending') as pending_leave,
         (select count(*)::int from blocked_attempts where created_at > now() - interval '7 days') as blocked_week,
         (select coalesce(sum(approved_hours * approved_rate), 0)::float from attendance
           where status = 'approved' and work_date >= $2 and work_date < $3) as payroll_month`,
      [today, from, next],
    );
    res.json({ today, month: currentMonth(), employees: employees.rows, ...counts.rows[0] });
  }),
);

// ---------- Attendance approvals ----------

router.get(
  '/attendance',
  asyncH(async (req, res) => {
    const today = todayStr();
    const view = String(req.query.view || 'approvals');
    let where = `(a.status = 'pending' or (a.status = 'open' and a.work_date < $1))`;
    const params = [today];
    if (view === 'month') {
      const month = String(req.query.month || currentMonth());
      const { from, next } = monthRange(month);
      where = 'a.work_date >= $2 and a.work_date < $3';
      params.push(from, next);
    }
    const { rows } = await query(
      `select a.id, a.work_date, a.check_in_at, a.check_out_at, a.in_distance_m, a.out_distance_m,
              a.worked_minutes, a.suggested_hours, a.approved_hours, a.status, a.note,
              (a.in_selfie_path is not null) as has_in_selfie, (a.out_selfie_path is not null) as has_out_selfie,
              e.id as employee_id, e.name, e.role_title, e.hourly_rate,
              coalesce((select sum(w.hours) from work_entries w
                         where w.employee_id = a.employee_id and w.work_date = a.work_date), 0)::float as logged_hours
         from attendance a join employees e on e.id = a.employee_id
        where ${where}
        order by a.work_date desc, e.name`,
      params,
    );
    res.json({ rows });
  }),
);

router.get(
  '/attendance/:id/selfie/:kind',
  asyncH(async (req, res) => {
    const id = validate(uuid, req.params.id);
    const kind = req.params.kind === 'out' ? 'out' : 'in';
    const { rows } = await query(
      `select ${kind}_selfie_path as p from attendance where id = $1`,
      [id],
    );
    const buf = rows[0]?.p ? await readSelfie(rows[0].p) : null;
    if (!buf) throw new HttpError(404, 'No selfie found.', 'NOT_FOUND');
    res.set({ 'Content-Type': 'image/jpeg', 'Cache-Control': 'private, max-age=300' });
    res.send(buf);
  }),
);

const hoursSchema = z.object({ hours: z.number().min(0).max(16) });

router.post(
  '/attendance/approve-all',
  asyncH(async (_req, res) => {
    const r = await query(
      `update attendance a
          set status = 'approved', approved_hours = a.suggested_hours, approved_rate = e.hourly_rate, approved_at = now()
         from employees e
        where e.id = a.employee_id and a.status = 'pending'`,
    );
    res.json({ approved: r.rowCount });
  }),
);

router.patch(
  '/attendance/:id/approve',
  asyncH(async (req, res) => {
    const id = validate(uuid, req.params.id);
    const { hours } = validate(hoursSchema, req.body);
    const r = await query(
      `update attendance a
          set status = 'approved', approved_hours = $2, approved_rate = e.hourly_rate, approved_at = now()
         from employees e
        where a.id = $1 and e.id = a.employee_id and a.status <> 'open'
        returning a.id, a.status, a.approved_hours`,
      [id, roundQuarter(hours)],
    );
    if (!r.rowCount) throw new HttpError(404, 'This record cannot be approved yet (it may still be open).', 'NOT_FOUND');
    res.json({ attendance: r.rows[0] });
  }),
);

router.patch(
  '/attendance/:id/reject',
  asyncH(async (req, res) => {
    const id = validate(uuid, req.params.id);
    const r = await query(
      `update attendance set status = 'rejected', approved_hours = 0, approved_rate = null, approved_at = now()
        where id = $1 and status <> 'open' returning id, status`,
      [id],
    );
    if (!r.rowCount) throw new HttpError(404, 'This record cannot be rejected.', 'NOT_FOUND');
    res.json({ attendance: r.rows[0] });
  }),
);

/** The employee forgot to check out: the admin closes the day with the hours worked. */
router.post(
  '/attendance/:id/close',
  asyncH(async (req, res) => {
    const id = validate(uuid, req.params.id);
    const { hours } = validate(hoursSchema, req.body);
    const r = await query(
      `update attendance a
          set check_out_at = coalesce(a.check_out_at, now()), worked_minutes = $2, suggested_hours = $3,
              approved_hours = $3, approved_rate = e.hourly_rate, status = 'approved', approved_at = now(),
              note = 'Closed by admin (no check-out)'
         from employees e
        where a.id = $1 and e.id = a.employee_id and a.status = 'open'
        returning a.id, a.status`,
      [id, Math.round(hours * 60), roundQuarter(hours)],
    );
    if (!r.rowCount) throw new HttpError(404, 'No open record found.', 'NOT_FOUND');
    res.json({ attendance: r.rows[0] });
  }),
);

// ---------- Employees ----------

router.get(
  '/employees',
  asyncH(async (_req, res) => {
    const { rows } = await query(
      'select id, code, name, role_title, hourly_rate, active, created_at from employees order by active desc, name',
    );
    res.json({ employees: rows });
  }),
);

const newEmployee = z.object({
  name: z.string().trim().min(2).max(60),
  role_title: z.string().trim().min(1).max(40),
  hourly_rate: z.number().min(0).max(100000),
  pin: pinSchema,
});

router.post(
  '/employees',
  asyncH(async (req, res) => {
    const d = validate(newEmployee, req.body);
    const pinHash = await hashPin(d.pin);
    const { rows } = await query(
      `insert into employees (code, name, role_title, hourly_rate, pin_hash)
       values ('AW-' || nextval('employee_code_seq'), $1, $2, $3, $4)
       returning id, code, name, role_title, hourly_rate, active`,
      [d.name, d.role_title, d.hourly_rate, pinHash],
    );
    res.status(201).json({ employee: rows[0] });
  }),
);

const editEmployee = z.object({
  name: z.string().trim().min(2).max(60).optional(),
  role_title: z.string().trim().min(1).max(40).optional(),
  hourly_rate: z.number().min(0).max(100000).optional(),
  active: z.boolean().optional(),
});

router.patch(
  '/employees/:id',
  asyncH(async (req, res) => {
    const id = validate(uuid, req.params.id);
    const d = validate(editEmployee, req.body);
    const { rows } = await query(
      `update employees set
         name = coalesce($2, name), role_title = coalesce($3, role_title),
         hourly_rate = coalesce($4, hourly_rate), active = coalesce($5, active)
       where id = $1 returning id, code, name, role_title, hourly_rate, active`,
      [id, d.name ?? null, d.role_title ?? null, d.hourly_rate ?? null, d.active ?? null],
    );
    if (!rows[0]) throw new HttpError(404, 'Employee not found.', 'NOT_FOUND');
    res.json({ employee: rows[0] });
  }),
);

router.post(
  '/employees/:id/reset-pin',
  asyncH(async (req, res) => {
    const id = validate(uuid, req.params.id);
    const { pin } = validate(z.object({ pin: pinSchema }), req.body);
    const r = await query(
      'update employees set pin_hash = $2, failed_attempts = 0, locked_until = null where id = $1',
      [id, await hashPin(pin)],
    );
    if (!r.rowCount) throw new HttpError(404, 'Employee not found.', 'NOT_FOUND');
    res.json({ ok: true });
  }),
);

// ---------- Daily work log ----------

router.get(
  '/work',
  asyncH(async (req, res) => {
    const date = String(req.query.date || todayStr());
    if (!DATE_RE.test(date)) throw new HttpError(400, 'date must look like 2026-10-31', 'VALIDATION');
    const entries = await query(
      `select w.id, w.employee_id, e.name as employee_name, w.task_type, w.item, w.hours, w.note
         from work_entries w join employees e on e.id = w.employee_id
        where w.work_date = $1 order by e.name, w.created_at`,
      [date],
    );
    const attendance = await query(
      `select a.employee_id, e.name, e.role_title, a.check_in_at, a.check_out_at, a.suggested_hours, a.approved_hours, a.status
         from attendance a join employees e on e.id = a.employee_id where a.work_date = $1 order by e.name`,
      [date],
    );
    const dates = await query(
      `select distinct work_date from (
         select work_date from work_entries union select work_date from attendance
       ) d order by work_date desc limit 60`,
    );
    res.json({
      date,
      entries: entries.rows,
      attendance: attendance.rows,
      dates: [...new Set([todayStr(), ...dates.rows.map((r) => r.work_date)])].sort().reverse(),
    });
  }),
);

// ---------- Leave ----------

router.get(
  '/leave',
  asyncH(async (_req, res) => {
    const { rows } = await query(
      `select l.id, l.leave_type, l.from_date, l.to_date, l.reason, l.status, l.created_at, e.name, e.role_title
         from leave_requests l join employees e on e.id = l.employee_id
        order by (l.status = 'pending') desc, l.from_date desc limit 200`,
    );
    res.json({ requests: rows });
  }),
);

router.patch(
  '/leave/:id',
  asyncH(async (req, res) => {
    const id = validate(uuid, req.params.id);
    const { status } = validate(z.object({ status: z.enum(['approved', 'rejected']) }), req.body);
    const r = await query(
      `update leave_requests set status = $2, decided_at = now()
        where id = $1 and status = 'pending' returning id, status`,
      [id, status],
    );
    if (!r.rowCount) throw new HttpError(404, 'This request was already decided.', 'NOT_FOUND');
    res.json({ request: r.rows[0] });
  }),
);

// ---------- Devices ----------

router.get(
  '/devices',
  asyncH(async (_req, res) => {
    const devices = await query(
      'select id, label, active, paired_at, last_seen, revoked_at from devices order by paired_at desc limit 20',
    );
    const blocked = await query(
      `select b.id, b.reason, b.user_agent, b.ip, b.created_at, e.name as employee_name
         from blocked_attempts b left join employees e on e.id = b.employee_id
        order by b.created_at desc limit 50`,
    );
    res.json({ devices: devices.rows, blocked: blocked.rows });
  }),
);

router.post(
  '/devices/pairing-code',
  asyncH(async (_req, res) => {
    const code = String(crypto.randomInt(0, 100000000)).padStart(8, '0');
    await query('update pairing_codes set used = true where not used');
    await query(
      `insert into pairing_codes (code_hash, expires_at) values ($1, now() + interval '10 minutes')`,
      [sha256(code)],
    );
    res.status(201).json({ code, expiresInMinutes: 10 });
  }),
);

router.delete(
  '/devices/:id',
  asyncH(async (req, res) => {
    const id = validate(uuid, req.params.id);
    const r = await query('update devices set active = false, revoked_at = now() where id = $1 and active', [id]);
    if (!r.rowCount) throw new HttpError(404, 'Device not found or already removed.', 'NOT_FOUND');
    res.json({ ok: true });
  }),
);

// ---------- Settings, kinds of work, items ----------

router.get(
  '/settings',
  asyncH(async (_req, res) => {
    const tasks = await query('select id, name from task_types where active order by id');
    const items = await query('select id, name from work_items where active order by name');
    res.json({ settings: await getSettings(), taskTypes: tasks.rows, items: items.rows });
  }),
);

const settingsSchema = z.object({
  companyName: z.string().trim().min(2).max(80).optional(),
  workshopLat: z.number().min(-90).max(90).optional(),
  workshopLng: z.number().min(-180).max(180).optional(),
  radiusM: z.number().int().min(20).max(2000).optional(),
  breakMinutes: z.number().int().min(0).max(180).optional(),
  breakAfterHours: z.number().min(0).max(12).optional(),
  weeklyOffDay: z.number().int().min(0).max(6).optional(),
});

router.put(
  '/settings',
  asyncH(async (req, res) => {
    const d = validate(settingsSchema, req.body);
    res.json({ settings: await saveSettings(d) });
  }),
);

const nameSchema = z.object({ name: z.string().trim().min(1).max(80) });

for (const [path, table] of [
  ['task-types', 'task_types'],
  ['items', 'work_items'],
]) {
  router.post(
    `/${path}`,
    asyncH(async (req, res) => {
      const { name } = validate(nameSchema, req.body);
      const { rows } = await query(
        `insert into ${table} (name) values ($1)
         on conflict (name) do update set active = true returning id, name`,
        [name],
      );
      res.status(201).json({ item: rows[0] });
    }),
  );
  router.delete(
    `/${path}/:id`,
    asyncH(async (req, res) => {
      const id = validate(z.coerce.number().int().positive(), req.params.id);
      await query(`update ${table} set active = false where id = $1`, [id]);
      res.json({ ok: true });
    }),
  );
}

// ---------- Reports ----------

async function salaryReport(month) {
  const { from, next } = monthRange(month);
  const { rows } = await query(
    `select e.id, e.code, e.name, e.role_title, e.hourly_rate, e.active,
            count(a.id) filter (where a.status in ('approved','pending'))::int as days,
            coalesce(sum(a.approved_hours) filter (where a.status = 'approved'), 0)::float as approved_hours,
            coalesce(sum(a.suggested_hours) filter (where a.status = 'pending'), 0)::float as pending_hours,
            coalesce(sum(a.approved_hours * a.approved_rate) filter (where a.status = 'approved'), 0)::float as payable
       from employees e
       left join attendance a on a.employee_id = e.id and a.work_date >= $1 and a.work_date < $2
      group by e.id
     having e.active or count(a.id) > 0
      order by e.name`,
    [from, next],
  );
  const totals = rows.reduce(
    (t, r) => ({
      days: t.days + r.days,
      approvedHours: t.approvedHours + r.approved_hours,
      pendingHours: t.pendingHours + r.pending_hours,
      payable: t.payable + r.payable,
    }),
    { days: 0, approvedHours: 0, pendingHours: 0, payable: 0 },
  );
  totals.payable = Math.round(totals.payable * 100) / 100;
  return { month, rows, totals };
}

function monthParam(req) {
  const month = String(req.query.month || currentMonth());
  if (!MONTH_RE.test(month)) throw new HttpError(400, 'month must look like 2026-10', 'VALIDATION');
  return month;
}

router.get(
  '/reports/salary',
  asyncH(async (req, res) => {
    res.json(await salaryReport(monthParam(req)));
  }),
);

router.get(
  '/reports/salary.csv',
  asyncH(async (req, res) => {
    const month = monthParam(req);
    const report = await salaryReport(month);
    const lines = [
      ['Code', 'Name', 'Role', 'Days', 'Approved hours', 'Pending hours', 'Hourly rate', 'Payable (INR)'].join(','),
      ...report.rows.map((r) =>
        [r.code, r.name, r.role_title, r.days, r.approved_hours, r.pending_hours, r.hourly_rate, r.payable]
          .map(csvEscape)
          .join(','),
      ),
      ['Total', '', '', report.totals.days, report.totals.approvedHours, report.totals.pendingHours, '', report.totals.payable].join(','),
    ];
    res.set({
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="salary-${month}.csv"`,
    });
    res.send(lines.join('\n'));
  }),
);

router.get(
  '/reports/attendance',
  asyncH(async (req, res) => {
    const month = monthParam(req);
    const { from, next, days } = monthRange(month);
    const today = todayStr();
    const settings = await getSettings();
    const emps = await query(
      `select e.id, e.name, e.created_at from employees e
        where e.active or exists (select 1 from attendance a where a.employee_id = e.id and a.work_date >= $1 and a.work_date < $2)
        order by e.name`,
      [from, next],
    );
    const att = await query(
      'select employee_id, work_date, status from attendance where work_date >= $1 and work_date < $2',
      [from, next],
    );
    const leaves = await query(
      `select employee_id, from_date, to_date from leave_requests
        where status = 'approved' and from_date < $2 and to_date >= $1`,
      [from, next],
    );
    const present = new Set(att.rows.filter((a) => a.status !== 'rejected').map((a) => `${a.employee_id}|${a.work_date}`));
    const rows = emps.rows.map((e) => {
      const joined = todayStr(new Date(e.created_at));
      const cells = [];
      let p = 0;
      let l = 0;
      let a = 0;
      for (let d = 1; d <= days; d++) {
        const date = `${month}-${String(d).padStart(2, '0')}`;
        const dow = new Date(`${date}T00:00:00Z`).getUTCDay();
        let c = '';
        if (present.has(`${e.id}|${date}`)) {
          c = 'P';
          p++;
        } else if (leaves.rows.some((x) => x.employee_id === e.id && x.from_date <= date && x.to_date >= date)) {
          c = 'L';
          l++;
        } else if (date < joined || date > today) {
          c = '';
        } else if (dow === settings.weeklyOffDay) {
          c = 'W';
        } else {
          c = 'A';
          a++;
        }
        cells.push(c);
      }
      return { id: e.id, name: e.name, cells, present: p, leave: l, absent: a };
    });
    res.json({ month, days, rows });
  }),
);

export default router;
