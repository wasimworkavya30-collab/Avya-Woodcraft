import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { config } from '../config.js';
import { query } from '../db.js';
import { checkPin, safeEqual, signUser } from '../auth.js';
import { asyncH, HttpError, validate } from '../utils.js';

export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: Number(process.env.LOGIN_RATE_LIMIT) || 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many attempts. Please wait a few minutes and try again.', code: 'RATE_LIMIT' },
});

const router = Router();

const employeeSchema = z.object({
  code: z.string().trim().min(2).max(20),
  pin: z.string().regex(/^\d{4,6}$/, 'PIN must be 4 to 6 digits'),
});

router.post(
  '/employee-login',
  loginLimiter,
  asyncH(async (req, res) => {
    const { code, pin } = validate(employeeSchema, req.body);
    const { rows } = await query('select * from employees where upper(code) = upper($1)', [code]);
    const emp = rows[0];

    if (emp?.locked_until && new Date(emp.locked_until) > new Date()) {
      throw new HttpError(429, 'Too many wrong PINs. Try again in 15 minutes.', 'LOCKED');
    }
    const ok = Boolean(emp && emp.active && (await checkPin(pin, emp.pin_hash)));
    if (!ok) {
      if (emp) {
        const failed = emp.failed_attempts + 1;
        const lock = failed >= 5;
        await query(
          `update employees
             set failed_attempts = $2,
                 locked_until = case when $3::boolean then now() + interval '15 minutes' else null end
           where id = $1`,
          [emp.id, lock ? 0 : failed, lock],
        );
      }
      throw new HttpError(401, 'Wrong employee code or PIN.', 'BAD_LOGIN');
    }
    await query('update employees set failed_attempts = 0, locked_until = null where id = $1', [emp.id]);
    const token = signUser({ sub: emp.id, role: 'employee', name: emp.name });
    res.json({
      token,
      user: { id: emp.id, role: 'employee', name: emp.name, code: emp.code, roleTitle: emp.role_title },
    });
  }),
);

const adminSchema = z.object({
  email: z.string().trim().min(3).max(120),
  password: z.string().min(1).max(200),
});

router.post(
  '/admin-login',
  loginLimiter,
  asyncH(async (req, res) => {
    const { email, password } = validate(adminSchema, req.body);
    const emailOk = safeEqual(email.toLowerCase(), config.adminEmail);
    const passOk = safeEqual(password, config.adminPassword);
    if (!(emailOk && passOk)) throw new HttpError(401, 'Wrong email or password.', 'BAD_LOGIN');
    const token = signUser({ sub: 'admin', role: 'admin', name: 'Main Admin' });
    res.json({ token, user: { id: 'admin', role: 'admin', name: 'Main Admin' } });
  }),
);

export default router;
