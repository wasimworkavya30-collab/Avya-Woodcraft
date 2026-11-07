import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { config } from '../config.js';
import { query, tx } from '../db.js';
import { sha256, signDevice } from '../auth.js';
import { getSettings } from '../settings.js';
import { asyncH, HttpError, validate } from '../utils.js';

const router = Router();

const pairLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: Number(process.env.LOGIN_RATE_LIMIT) || 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many attempts. Please wait a few minutes and try again.', code: 'RATE_LIMIT' },
});

/** Public: company name and whether this phone is the authorized company mobile. */
router.get(
  '/status',
  asyncH(async (req, res) => {
    let authorized = false;
    const token = req.headers['x-device-token'];
    if (token) {
      try {
        const p = jwt.verify(token, config.deviceSecret, { issuer: 'avya-device' });
        const { rows } = await query('select 1 from devices where id = $1 and active', [p.did]);
        authorized = rows.length > 0;
      } catch {
        authorized = false;
      }
    }
    const s = await getSettings();
    res.json({ authorized, companyName: s.companyName });
  }),
);

const pairSchema = z.object({
  code: z.string().regex(/^\d{8}$/, 'The code has 8 digits'),
  label: z.string().trim().max(60).optional(),
});

/** Public (rate limited): exchange a one-time code from the admin for a device token. */
router.post(
  '/pair',
  pairLimiter,
  asyncH(async (req, res) => {
    const { code, label } = validate(pairSchema, req.body);
    const result = await tx(async (client) => {
      const found = await client.query(
        `select id from pairing_codes
          where code_hash = $1 and not used and expires_at > now()
          for update`,
        [sha256(code)],
      );
      if (!found.rows[0]) throw new HttpError(400, 'That code is wrong or has expired.', 'BAD_CODE');
      await client.query('update pairing_codes set used = true where id = $1', [found.rows[0].id]);
      // Only one phone may be authorized: the new one replaces the old one.
      await client.query('update devices set active = false, revoked_at = now() where active');
      const ins = await client.query(
        'insert into devices (label, user_agent) values ($1, $2) returning id, label',
        [label || 'Company mobile', String(req.headers['user-agent'] || '').slice(0, 300)],
      );
      return ins.rows[0];
    });
    res.status(201).json({ deviceToken: signDevice(result.id), label: result.label });
  }),
);

export default router;
