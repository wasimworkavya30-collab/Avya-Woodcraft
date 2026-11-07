import { query } from './db.js';
import { config } from './config.js';

const DEFAULT_TASKS = [
  'Cutting',
  'Planing',
  'Joinery',
  'Carving',
  'Assembly',
  'Sanding',
  'Polishing',
  'Finishing',
  'Machine setup',
  'Packing',
  'Loading',
  'Other',
];

/** Fill in default settings and task types the first time the server starts. */
export async function bootstrap() {
  const defaults = [
    ['company_name', config.companyName],
    ['workshop_lat', config.defaults.lat],
    ['workshop_lng', config.defaults.lng],
    ['radius_m', config.defaults.radius],
    ['break_minutes', 60],
    ['break_after_hours', 5],
    ['weekly_off_day', 0],
  ];
  for (const [key, value] of defaults) {
    await query(
      'insert into settings (key, value) values ($1, $2::jsonb) on conflict (key) do nothing',
      [key, JSON.stringify(value)],
    );
  }
  const { rows } = await query('select count(*)::int as n from task_types');
  if (rows[0].n === 0) {
    for (const name of DEFAULT_TASKS) {
      await query('insert into task_types (name) values ($1) on conflict do nothing', [name]);
    }
  }
}

export async function getSettings() {
  const { rows } = await query('select key, value from settings');
  const s = {};
  for (const r of rows) s[r.key] = r.value;
  return {
    companyName: s.company_name ?? config.companyName,
    workshopLat: Number(s.workshop_lat) || 0,
    workshopLng: Number(s.workshop_lng) || 0,
    radiusM: Number(s.radius_m) || 150,
    breakMinutes: Number(s.break_minutes ?? 60),
    breakAfterHours: Number(s.break_after_hours ?? 5),
    weeklyOffDay: Number(s.weekly_off_day ?? 0),
  };
}

export async function saveSettings(values) {
  const map = {
    companyName: 'company_name',
    workshopLat: 'workshop_lat',
    workshopLng: 'workshop_lng',
    radiusM: 'radius_m',
    breakMinutes: 'break_minutes',
    breakAfterHours: 'break_after_hours',
    weeklyOffDay: 'weekly_off_day',
  };
  for (const [field, key] of Object.entries(map)) {
    if (values[field] === undefined) continue;
    await query(
      'insert into settings (key, value) values ($1, $2::jsonb) on conflict (key) do update set value = excluded.value',
      [key, JSON.stringify(values[field])],
    );
  }
  return getSettings();
}
