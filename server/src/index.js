import { createApp } from './app.js';
import { config } from './config.js';
import { bootstrap } from './settings.js';
import { ensureBucket, storageDriver } from './storage.js';

async function main() {
  try {
    await bootstrap();
  } catch (err) {
    if (err.code === '42P01') {
      console.error('The database tables do not exist yet. Run database/schema.sql in Supabase first (see README).');
    } else {
      console.error('Could not reach the database. Check DATABASE_URL.', err.message);
    }
    process.exit(1);
  }
  await ensureBucket();
  createApp().listen(config.port, () => {
    console.log(`Avya attendance API listening on port ${config.port} (selfie storage: ${storageDriver})`);
  });
}

main();
