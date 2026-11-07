// Creates all tables from database/schema.sql using DATABASE_URL.
// Usage: npm run db:init   (an alternative to pasting the file in the Supabase SQL Editor)
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pool } from '../db.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const schemaPath = path.resolve(here, '../../../database/schema.sql');

try {
  const sql = await fs.readFile(schemaPath, 'utf8');
  await pool.query(sql);
  console.log('Database tables are ready.');
} catch (err) {
  console.error('Could not create the tables:', err.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
