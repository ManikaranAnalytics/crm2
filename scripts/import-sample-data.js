'use strict';

const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

function loadDatabaseUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  const envPath = path.join(__dirname, '..', '.env.local');
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/);
    for (const line of lines) {
      const m = line.match(/^\s*DATABASE_URL\s*=\s*(.+)\s*$/);
      if (m) {
        return m[1].trim().replace(/^['"]|['"]$/g, '');
      }
    }
  }
  throw new Error('DATABASE_URL not found in env or .env.local');
}

const pool = new Pool({ connectionString: loadDatabaseUrl() });

async function getOrCreateRole(name) {
  const existing = await pool.query('SELECT id FROM roles WHERE name = $1', [name]);
  if (existing.rows[0]) return existing.rows[0].id;
  const ins = await pool.query('INSERT INTO roles (name) VALUES ($1) RETURNING id', [name]);
  return ins.rows[0].id;
}

async function getOrCreateUser(email, displayName, roleName, rank) {
  const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
  if (existing.rows[0]) return existing.rows[0].id;
  const roleId = await getOrCreateRole(roleName);
  const res = await pool.query(
    'INSERT INTO users (email, password_hash, name, role_id, rank) VALUES ($1,$2,$3,$4,$5) RETURNING id',
    [email, 'changeme', displayName, roleId, rank],
  );
  return res.rows[0].id;
}

async function findAnyAdmin() {
  const res = await pool.query(
    `SELECT u.id, u.name
       FROM users u
       JOIN roles r ON r.id = u.role_id
      WHERE r.name = 'ADMIN'
      ORDER BY u.id
      LIMIT 1`,
  );
  return res.rows[0] || null;
}

async function getOrCreateClient(name, state) {
  if (!name) return null;
  const ex = await pool.query('SELECT id FROM clients WHERE name = $1', [name]);
  if (ex.rows[0]) return ex.rows[0].id;
  const ins = await pool.query(
    'INSERT INTO clients (name, state) VALUES ($1, $2) RETURNING id',
    [name, state || null],
  );
  return ins.rows[0].id;
}

async function getOrCreatePss(clientId, pssName, state, capacityMw, technology, sps, aggregation) {
  if (!clientId || !pssName) return null;
  const ex = await pool.query(
    'SELECT id FROM client_pss WHERE client_id = $1 AND name = $2',
    [clientId, pssName],
  );
  if (ex.rows[0]) return ex.rows[0].id;
  const ins = await pool.query(
    `INSERT INTO client_pss (client_id, name, state, capacity_mw, technology, sps, aggregation)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       RETURNING id`,
    [clientId, pssName, state || null, capacityMw, technology || null, !!sps, !!aggregation],
  );
  return ins.rows[0].id;
}

function parseCapacity(raw) {
  if (!raw) return null;
  const cleaned = String(raw).replace(/\s+/g, '');
  const parts = cleaned.split('+');
  let sum = 0;
  let found = false;
  for (const p of parts) {
    if (!p) continue;
    const n = Number(p);
    if (!Number.isNaN(n)) {
      sum += n;
      found = true;
    }
  }
  return found ? sum : null;
}

function mapTechnology(type) {
  if (!type) return null;
  const t = String(type).toUpperCase();
  const hasSolar = t.includes('SOLAR');
  const hasWind = t.includes('WIND');
  const hasBattery = t.includes('BATTERY');
  if (hasSolar && hasWind && hasBattery) return 'SOLAR_WIND_BATTERY';
  if (hasSolar && hasWind) return 'SOLAR_WIND';
  if (hasSolar && hasBattery) return 'SOLAR_BATTERY';
  if (hasWind && hasBattery) return 'WIND_BATTERY';
  if (hasSolar) return 'SOLAR';
  if (hasWind) return 'WIND';
  return null;
}

async function main() {
  const jsonlPath = path.join(__dirname, '..', 'sample_data_sheet1.jsonl');
  if (!fs.existsSync(jsonlPath)) {
    throw new Error('sample_data_sheet1.jsonl not found; run the extractor first');
  }
  const admin = await findAnyAdmin();
  const vaishaliId = await getOrCreateUser(
    'vaishali@manikarananalytics.in',
    'Vaishali',
    'EMPLOYEE',
    50,
  );
  const bhupendraId = await getOrCreateUser(
    'bhupendra@manikarananalytics.in',
    'Bhupendra',
    'EMPLOYEE',
    50,
  );
  const assignees = [
    { id: vaishaliId, name: 'Vaishali' },
    { id: bhupendraId, name: 'Bhupendra' },
  ];

  let inserted = 0;
  let skipped = 0;

  const lines = fs.readFileSync(jsonlPath, 'utf8').split(/\r?\n/).filter(Boolean);
  for (let i = 0; i < lines.length; i += 1) {
    const row = JSON.parse(lines[i]);
    const queryCode = `IMP-${String(i + 1).padStart(4, '0')}`;
    const exists = await pool.query('SELECT id FROM queries WHERE query_code = $1', [queryCode]);
    if (exists.rows[0]) {
      skipped += 1;
      continue;
    }
    const capacityMw = parseCapacity(row.capacityRaw);
    const technology = mapTechnology(row.type);
    const clientId = await getOrCreateClient(row.clientName, row.state);
    const pssId = await getOrCreatePss(
      clientId,
      row.pss,
      row.state,
      capacityMw,
      technology,
      row.sps,
      row.aggregation,
    );
    const assignee = assignees[Math.floor(Math.random() * assignees.length)];
    const isClosed = !!row.queryEndDate;
    const currentStatus = isClosed ? 'CLOSED' : 'OPEN';

    await pool.query(
      `INSERT INTO queries (
         query_code, client_id, pss_id, pss_text, state, "group",
         capacity_mw, technology, transmission_type, period_of_issue, issue,
         query_entry_date, query_raised_date, closed_date, current_status,
         responsibility_to_id, responsibility_to, raised_by_id, raised_by
       ) VALUES (
         $1,$2,$3,$4,$5,$6,
         $7,$8,$9,$10,$11,
         $12,$13,$14,$15,
         $16,$17,$18,$19
       )`,
      [
        queryCode,
        clientId,
        pssId,
        row.pss || null,
        row.state || null,
        row.group || null,
        capacityMw,
        technology,
        row.connectivity || null,
        row.issuePeriod || null,
        row.queryType || null,
        row.queryEntryDate || null,
        row.queryAssignedDate || null,
        row.queryEndDate || null,
        currentStatus,
        assignee.id,
        assignee.name,
        admin ? admin.id : null,
        admin ? admin.name : null,
      ],
    );
    inserted += 1;
  }

  console.log(`Imported queries: inserted=${inserted}, skipped=${skipped}`);
}

main()
  .catch((err) => {
    console.error('Import failed:', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });

