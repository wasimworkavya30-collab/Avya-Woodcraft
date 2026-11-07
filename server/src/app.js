import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { ZodError } from 'zod';
import { config } from './config.js';
import { query } from './db.js';
import { HttpError } from './utils.js';
import authRoutes from './routes/auth.js';
import deviceRoutes from './routes/device.js';
import employeeRoutes from './routes/employee.js';
import adminRoutes from './routes/admin.js';

export function createApp() {
  const app = express();
  app.set('trust proxy', 1);
  app.disable('x-powered-by');
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  app.use(
    cors({
      origin(origin, cb) {
        // Allow the configured frontend(s) and non-browser tools (no Origin header).
        cb(null, !origin || config.clientOrigins.includes(origin));
      },
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Device-Token'],
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      maxAge: 600,
    }),
  );
  app.use(express.json({ limit: '700kb' }));

  app.get('/health', async (_req, res) => {
    try {
      await query('select 1');
      res.json({ ok: true });
    } catch {
      res.status(503).json({ ok: false });
    }
  });

  app.use('/api/auth', authRoutes);
  app.use('/api/device', deviceRoutes);
  app.use('/api/me', employeeRoutes);
  app.use('/api/admin', adminRoutes);

  app.use((_req, _res, next) => next(new HttpError(404, 'Not found.', 'NOT_FOUND')));

  // eslint-disable-next-line no-unused-vars
  app.use((err, _req, res, _next) => {
    if (err instanceof HttpError) {
      return res.status(err.status).json({ error: err.message, code: err.code });
    }
    if (err instanceof ZodError) {
      return res.status(400).json({ error: err.issues[0]?.message || 'Invalid data.', code: 'VALIDATION' });
    }
    if (err?.type === 'entity.too.large') {
      return res.status(413).json({ error: 'The photo is too large. Please try again.', code: 'TOO_LARGE' });
    }
    if (err?.type === 'entity.parse.failed') {
      return res.status(400).json({ error: 'Invalid request.', code: 'VALIDATION' });
    }
    console.error(err);
    res.status(500).json({ error: 'Something went wrong on the server.', code: 'SERVER_ERROR' });
  });

  return app;
}
