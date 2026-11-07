import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { config } from './config.js';
import { query } from './db.js';
import { asyncH, HttpError } from './utils.js';

export const hashPin = (pin) => bcrypt.hash(pin, 10);
export const checkPin = (pin, hash) => bcrypt.compare(pin, hash);
export const sha256 = (s) => crypto.createHash('sha256').update(String(s)).digest('hex');

/** Constant-time string comparison. */
export function safeEqual(a, b) {
  const x = crypto.createHash('sha256').update(String(a)).digest();
  const y = crypto.createHash('sha256').update(String(b)).digest();
  return crypto.timingSafeEqual(x, y);
}

export const signUser = (payload) =>
  jwt.sign(payload, config.jwtSecret, { expiresIn: '12h', issuer: 'avya' });

export const signDevice = (deviceId) =>
  jwt.sign({ typ: 'device', did: deviceId }, config.deviceSecret, { issuer: 'avya-device' });

/** Require a logged-in user with the given role ('admin' or 'employee'). */
export function requireAuth(role) {
  return asyncH(async (req, _res, next) => {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) throw new HttpError(401, 'Please log in.', 'NO_TOKEN');
    let payload;
    try {
      payload = jwt.verify(token, config.jwtSecret, { issuer: 'avya' });
    } catch {
      throw new HttpError(401, 'Your session has ended. Please log in again.', 'BAD_TOKEN');
    }
    if (payload.role !== role) throw new HttpError(403, 'You do not have access to this.', 'FORBIDDEN');
    if (role === 'employee') {
      const { rows } = await query(
        'select id, code, name, role_title, hourly_rate from employees where id = $1 and active',
        [payload.sub],
      );
      if (!rows[0]) throw new HttpError(401, 'This account is not active.', 'INACTIVE');
      req.emp = rows[0];
    }
    req.user = payload;
    next();
  });
}

/**
 * Only the paired company mobile may check in or out.
 * The phone holds a signed device token; the database decides whether it is still active.
 */
export const requireDevice = asyncH(async (req, _res, next) => {
  const token = req.headers['x-device-token'];
  let device = null;
  if (token) {
    try {
      const payload = jwt.verify(token, config.deviceSecret, { issuer: 'avya-device' });
      if (payload.typ === 'device') {
        const { rows } = await query('select id from devices where id = $1 and active', [payload.did]);
        device = rows[0] || null;
      }
    } catch {
      device = null;
    }
  }
  if (!device) {
    await query(
      'insert into blocked_attempts (employee_id, reason, user_agent, ip) values ($1, $2, $3, $4)',
      [
        req.emp?.id ?? null,
        token ? 'Device was revoked or token is invalid' : 'Phone is not registered',
        String(req.headers['user-agent'] || '').slice(0, 300),
        req.ip,
      ],
    );
    throw new HttpError(
      403,
      'This phone is not the authorized company mobile. Attendance can only be marked on the company mobile.',
      'DEVICE_NOT_AUTHORIZED',
    );
  }
  query('update devices set last_seen = now() where id = $1', [device.id]).catch(() => {});
  req.device = device;
  next();
});
