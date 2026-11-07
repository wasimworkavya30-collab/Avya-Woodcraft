import fs from 'node:fs/promises';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';
import { config } from './config.js';

const useSupabase = Boolean(config.supabaseUrl && config.supabaseKey);
const supabase = useSupabase
  ? createClient(config.supabaseUrl, config.supabaseKey, { auth: { persistSession: false } })
  : null;
const localDir = path.resolve(process.cwd(), 'uploads');

export const storageDriver = useSupabase ? 'supabase' : 'local';

/** Create the private selfie bucket if it does not exist yet. */
export async function ensureBucket() {
  if (!useSupabase) return;
  const { error } = await supabase.storage.createBucket(config.bucket, { public: false });
  if (error && !/already exists|duplicate/i.test(error.message)) {
    console.warn(`Could not create storage bucket "${config.bucket}": ${error.message}`);
  }
}

export async function saveSelfie(filePath, buffer) {
  if (useSupabase) {
    const { error } = await supabase.storage
      .from(config.bucket)
      .upload(filePath, buffer, { contentType: 'image/jpeg', upsert: true });
    if (error) throw new Error(`Selfie upload failed: ${error.message}`);
    return filePath;
  }
  const target = path.resolve(localDir, filePath);
  if (!target.startsWith(localDir + path.sep)) throw new Error('Invalid selfie path');
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.writeFile(target, buffer);
  return filePath;
}

export async function readSelfie(filePath) {
  if (!filePath) return null;
  if (useSupabase) {
    const { data, error } = await supabase.storage.from(config.bucket).download(filePath);
    if (error || !data) return null;
    return Buffer.from(await data.arrayBuffer());
  }
  const target = path.resolve(localDir, filePath);
  if (!target.startsWith(localDir + path.sep)) return null;
  try {
    return await fs.readFile(target);
  } catch {
    return null;
  }
}
