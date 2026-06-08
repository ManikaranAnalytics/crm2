/* One-off seeder for demo clients, so the Add Query dropdown is populated.
 * Usage: node scripts/seed-demo-clients.js
 */
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const envPath = path.resolve(__dirname, '..', '.env.local');
const env = fs.readFileSync(envPath, 'utf8');
const m = env.match(/DATABASE_URL\s*=\s*"?([^"\n\r]+)"?/);
if (!m) {
  console.error('No DATABASE_URL found in .env.local');
  process.exit(1);
}
const connectionString = m[1].replace(/^"|"$/g, '');
const pool = new Pool({ connectionString });

const DEMO_CLIENTS = [
  { name: 'ACME Renewables', state: 'RJ' },
  { name: 'Brookfield India', state: 'RJ' },
  { name: 'Eden Renewables', state: 'RJ' },
  { name: 'Adani Green Energy', state: 'GJ' },
  { name: 'ReNew Power', state: 'KA' },
  { name: 'Tata Power Renewables', state: 'MH' },
  { name: 'Azure Power', state: 'TN' },
  { name: 'Greenko', state: 'AP' },
];

(async () => {
  try {
    const adminResult = await pool.query(
      `SELECT id FROM users WHERE email = 'admin@example.com' LIMIT 1`,
    );
    const adminId = adminResult.rows[0]?.id ?? null;

    let inserted = 0;
    let skipped = 0;

    for (const c of DEMO_CLIENTS) {
      const existing = await pool.query(
        `SELECT id FROM clients WHERE LOWER(name) = LOWER($1) LIMIT 1`,
        [c.name],
      );
      if (existing.rows[0]) {
        skipped += 1;
        continue;
      }
      await pool.query(
        `INSERT INTO clients (name, state, is_approved, created_by, approved_by, approved_at)
         VALUES ($1, $2, TRUE, $3, $3, now())`,
        [c.name, c.state, adminId],
      );
      inserted += 1;
    }

    const total = await pool.query(`SELECT COUNT(*)::int AS c FROM clients`);
    console.log(`inserted=${inserted} skipped=${skipped} total_clients=${total.rows[0].c}`);
  } catch (err) {
    console.error('Seed failed:', err.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
})();
