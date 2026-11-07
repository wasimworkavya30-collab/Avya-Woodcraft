import 'dotenv/config';

const isProd = process.env.NODE_ENV === 'production';

function required(key) {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing environment variable ${key}. See server/.env.example.`);
  }
  return value;
}

const jwtSecret = required('JWT_SECRET');
const deviceSecret = required('DEVICE_TOKEN_SECRET');
const adminPassword = required('ADMIN_PASSWORD');

if (jwtSecret.length < 32 || deviceSecret.length < 32) {
  throw new Error('JWT_SECRET and DEVICE_TOKEN_SECRET must be at least 32 characters.');
}
if (isProd && adminPassword.length < 10) {
  throw new Error('ADMIN_PASSWORD must be at least 10 characters in production.');
}

export const config = {
  isProd,
  port: Number(process.env.PORT) || 4000,
  databaseUrl: required('DATABASE_URL'),
  databaseSsl: process.env.DATABASE_SSL !== 'false',
  jwtSecret,
  deviceSecret,
  adminEmail: required('ADMIN_EMAIL').trim().toLowerCase(),
  adminPassword,
  clientOrigins: (process.env.CLIENT_ORIGIN || 'http://localhost:5173')
    .split(',')
    .map((s) => s.trim().replace(/\/$/, ''))
    .filter(Boolean),
  timezone: process.env.TIMEZONE || 'Asia/Kolkata',
  companyName: process.env.COMPANY_NAME || 'Avya Woodcraft LLP',
  defaults: {
    lat: Number(process.env.WORKSHOP_LAT) || 0,
    lng: Number(process.env.WORKSHOP_LNG) || 0,
    radius: Number(process.env.GEOFENCE_RADIUS_M) || 150,
  },
  supabaseUrl: process.env.SUPABASE_URL || '',
  supabaseKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  bucket: process.env.SUPABASE_BUCKET || 'selfies',
};
