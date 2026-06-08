/* End-to-end smoke test:
 *   1. login as admin
 *   2. POST /api/queries with a fake .msg attachment + x-actor-id
 *   3. confirm a row was inserted in `queries`
 * Usage: node scripts/smoke-create-query.js
 */
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const BASE = process.env.BASE_URL || 'http://localhost:3000';

async function jpost(url, body, headers = {}) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
  });
  const txt = await res.text();
  let data = null;
  try { data = JSON.parse(txt); } catch { data = txt; }
  return { status: res.status, data };
}

(async () => {
  const envPath = path.resolve(__dirname, '..', '.env.local');
  const env = fs.readFileSync(envPath, 'utf8');
  const m = env.match(/DATABASE_URL\s*=\s*"?([^"\n\r]+)"?/);
  const pool = new Pool({ connectionString: m[1].replace(/^"|"$/g, '') });

  console.log('1) login...');
  const login = await jpost(`${BASE}/api/auth/login`, {
    email: 'admin@example.com',
    password: 'admin123',
  });
  console.log('   login status:', login.status, JSON.stringify(login.data));
  if (login.status !== 200) {
    console.error('login failed — stopping');
    await pool.end();
    process.exit(1);
  }
  const actorId = login.data.user.id;

  console.log('2) look up first client and first pss_master...');
  const clients = await pool.query(`SELECT id, name FROM clients ORDER BY id LIMIT 1`);
  const pss = await pool.query(
    `SELECT id, name, state, capacity_mw, technology, transmission_type
       FROM pss_master ORDER BY id LIMIT 1`,
  );
  if (!clients.rows[0] || !pss.rows[0]) {
    console.error('need at least 1 client and 1 pss_master row');
    await pool.end();
    process.exit(1);
  }
  console.log('   client:', clients.rows[0].name);
  console.log('   pss   :', pss.rows[0].name);

  const fakeMsg = Buffer.from('FakeMsgBody').toString('base64');

  console.log('3) POST /api/queries with x-actor-id=' + actorId + '...');
  const create = await jpost(
    `${BASE}/api/queries`,
    {
      clientId: clients.rows[0].id,
      pssId: pss.rows[0].id,
      pssText: pss.rows[0].name,
      state: pss.rows[0].state,
      capacityMw: pss.rows[0].capacity_mw,
      technology: pss.rows[0].technology,
      transmissionType: pss.rows[0].transmission_type,
      issue: 'High DSM',
      periodOfIssue: '2026-04-01 to 2026-04-15',
      status: 'OPEN',
      attachment: {
        fileName: 'smoke-test.msg',
        dataBase64: fakeMsg,
        contentType: 'application/octet-stream',
      },
    },
    { 'x-actor-id': String(actorId) },
  );
  console.log('   create status:', create.status);
  console.log('   create body  :', JSON.stringify(create.data));

  console.log('4) DB counts after:');
  for (const t of ['queries', 'attachments']) {
    const r = await pool.query(`SELECT COUNT(*)::int AS c FROM ${t}`);
    console.log(`   ${t.padEnd(15)} ${r.rows[0].c}`);
  }

  const latest = await pool.query(
    `SELECT id, query_code, current_status, raised_by_id, client_id, pss_id, pss_text
       FROM queries ORDER BY id DESC LIMIT 1`,
  );
  console.log('   latest query row:', JSON.stringify(latest.rows[0] || null));

  await pool.end();
})();
