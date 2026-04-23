import { readdir, readFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import pool from './pool.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = join(__dirname, '../../db/migrations');

async function migrate() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS _migrations (
        id         SERIAL PRIMARY KEY,
        filename   TEXT NOT NULL UNIQUE,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    const files = (await readdir(MIGRATIONS_DIR))
      .filter(f => f.endsWith('.sql'))
      .sort();

    const { rows: applied } = await client.query('SELECT filename FROM _migrations');
    const appliedSet = new Set(applied.map(r => r.filename));

    for (const file of files) {
      if (appliedSet.has(file)) {
        console.log(`[migrate] skip  ${file}`);
        continue;
      }
      console.log(`[migrate] apply ${file}`);
      const sql = await readFile(join(MIGRATIONS_DIR, file), 'utf8');
      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query('INSERT INTO _migrations (filename) VALUES ($1)', [file]);
        await client.query('COMMIT');
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      }
    }
    console.log('[migrate] done');
  } finally {
    client.release();
  }
}

migrate()
  .then(() => pool.end())
  .catch(err => {
    console.error('[migrate] error:', err.message);
    pool.end();
    process.exit(1);
  });
