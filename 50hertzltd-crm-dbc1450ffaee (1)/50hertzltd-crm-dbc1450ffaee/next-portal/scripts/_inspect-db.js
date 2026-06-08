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

(async () => {
  const tables = [
    'users',
    'roles',
    'clients',
    'pss_master',
    'client_pss',
    'queries',
    'attachments',
    'query_attachments',
    'query_approvals',
    'query_status_history',
  ];
  for (const t of tables) {
    try {
      const r = await pool.query(`SELECT COUNT(*)::int AS c FROM ${t}`);
      console.log(t.padEnd(25), r.rows[0].c);
    } catch (e) {
      console.log(t.padEnd(25), 'ERR', e.message.split('\n')[0]);
    }
  }
  await pool.end();
})();
