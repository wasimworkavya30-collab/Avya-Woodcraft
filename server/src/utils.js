import { config } from './config.js';

export class HttpError extends Error {
  constructor(status, message, code) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export const asyncH = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

/** Parse request data with a zod schema; throw a friendly 400 on failure. */
export function validate(schema, data) {
  const result = schema.safeParse(data);
  if (!result.success) {
    const issue = result.error.issues[0];
    const field = issue.path.join('.');
    throw new HttpError(400, field ? `${field}: ${issue.message}` : issue.message, 'VALIDATION');
  }
  return result.data;
}

/** Today's date (YYYY-MM-DD) in the company time zone. */
export function todayStr(date = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: config.timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

export const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;
export const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function currentMonth() {
  return todayStr().slice(0, 7);
}

export function monthRange(ym) {
  if (!MONTH_RE.test(ym)) throw new HttpError(400, 'month must look like 2026-10', 'VALIDATION');
  const [y, m] = ym.split('-').map(Number);
  const next = m === 12 ? `${y + 1}-01-01` : `${y}-${String(m + 1).padStart(2, '0')}-01`;
  return { from: `${ym}-01`, next, days: new Date(Date.UTC(y, m, 0)).getUTCDate() };
}

export function addDays(dateStr, n) {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export function daysBetween(a, b) {
  return Math.round((new Date(`${b}T00:00:00Z`) - new Date(`${a}T00:00:00Z`)) / 86400000) + 1;
}

/** Distance in metres between two GPS points. */
export function haversine(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const rad = (x) => (x * Math.PI) / 180;
  const dLat = rad(lat2 - lat1);
  const dLng = rad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLng / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(a)));
}

export const roundQuarter = (hours) => Math.round(hours * 4) / 4;

/** Worked minutes -> payable hours (rounded to 0.25) after the automatic break rule. */
export function suggestHours(minutes, { breakMinutes, breakAfterHours }) {
  let m = minutes;
  if (m / 60 > breakAfterHours) m -= breakMinutes;
  return Math.max(0, roundQuarter(m / 60));
}

export function csvEscape(value) {
  const s = String(value ?? '');
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
