import 'dotenv/config';
import fs   from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Pool } from 'pg';

// Resolve the migrations folder relative to this file, not the working directory
const thisDir  = path.dirname(fileURLToPath(import.meta.url));
const migrDir  = path.join(thisDir, 'migrations');

const pool = new Pool({
  host:     process.env['DB_HOST']     || 'localhost',
  port:     Number(process.env['DB_PORT'] || 5432),
  database: process.env['DB_NAME']     || 'ngcart',
  user:     process.env['DB_USER']     || 'ngcart',
  password: process.env['DB_PASSWORD'] || 'ngcart_dev',
  ssl:      process.env['DB_SSL'] === 'false' ? false : { rejectUnauthorized: false },
});

async function migrate(): Promise<void> {
  const client = await pool.connect();
  try {

    // Create the version ledger table if it doesn't exist yet
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version    INT          PRIMARY KEY,
        filename   TEXT         NOT NULL,
        applied_at TIMESTAMPTZ  NOT NULL DEFAULT now()
      )
    `);

    // Find the highest version already applied
    const { rows } = await client.query<{ version: number }>(
      'SELECT COALESCE(MAX(version), 0) AS version FROM schema_migrations',
    );
    const lastVersion = rows[0].version;
    console.log(`Last applied version: V${String(lastVersion).padStart(3, '0')}`);

    // Read and sort all V###__description.sql files
    const files = fs.readdirSync(migrDir)
      .filter(f => /^V\d+__.+\.sql$/.test(f))
      .sort();

    // Apply every file whose version number is higher than lastVersion
    let applied = 0;
    for (const file of files) {
      const version = Number(file.match(/^V(\d+)__/)![1]);
      if (version <= lastVersion) continue;

      console.log(`Applying ${file} ...`);
      const sql = fs.readFileSync(path.join(migrDir, file), 'utf8');

      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query(
          'INSERT INTO schema_migrations (version, filename) VALUES ($1, $2)',
          [version, file],
        );
        await client.query('COMMIT');
        console.log(`  ✓ done`);
        applied++;
      } catch (err) {
        await client.query('ROLLBACK');
        console.error(`  ✗ FAILED — rolled back`);
        console.error(err);
        process.exit(1);   // stop immediately; do not attempt further migrations
      }
    }

    console.log(applied === 0 ? 'Nothing to apply — database is up to date.' : `Done. ${applied} migration(s) applied.`);

  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
