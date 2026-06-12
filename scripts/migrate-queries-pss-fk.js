/* Drops the old FK `queries.pss_id -> client_pss(id)` so that `pss_id` can
 * instead reference the new `pss_master` table. We keep `pss_id` as a plain
 * int column without a DB-enforced FK (matches the new master-PSS design).
 * Safe to run multiple times.
 */
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const envPath = path.resolve(__dirname, '..', '.env.local');
const env = fs.readFileSync(envPath, 'utf8');
const m = env.match(/DATABASE_URL\s*=\s*"?([^"\n\r]+)"?/);
const pool = new Pool({ connectionString: m[1].replace(/^"|"$/g, '') });

(async () => {
  try {
    const constraints = await pool.query(
      `SELECT conname
         FROM pg_constraint c
         JOIN pg_class t ON t.oid = c.conrelid
        WHERE t.relname = 'queries'
          AND c.contype = 'f'
          AND pg_get_constraintdef(c.oid) ILIKE '%REFERENCES client_pss%'`,
    );
    if (constraints.rows.length === 0) {
      console.log('No client_pss FK found on queries. Nothing to drop.');
    } else {
      for (const row of constraints.rows) {
        console.log('Dropping FK:', row.conname);
        await pool.query(`ALTER TABLE queries DROP CONSTRAINT "${row.conname}"`);
      }
      console.log('Done.');
    }
  } catch (err) {
    console.error('Migration failed:', err.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
})();
