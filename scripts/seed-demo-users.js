const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

function readDatabaseUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  const envPath = path.join(__dirname, '..', '.env.local');
  if (!fs.existsSync(envPath)) {
    throw new Error('DATABASE_URL not found in environment or .env.local');
  }
  const env = fs.readFileSync(envPath, 'utf8');
  const match = env.match(/^\s*DATABASE_URL\s*=\s*(.+)\s*$/m);
  if (!match) throw new Error('DATABASE_URL not found in .env.local');
  return match[1].trim().replace(/^["']|["']$/g, '');
}

async function main() {
  const connectionString = readDatabaseUrl();
  const pool = new Pool({ connectionString });

  const roles = ['ADMIN', 'MANAGER', 'KAM'];
  
  const demoUsers = [
    { email: 'admin@demo.com', name: 'Demo Admin', role: 'ADMIN', rank: 1 },
    { email: 'manager@demo.com', name: 'Demo Manager', role: 'MANAGER', rank: 2 },
    { email: 'kam@demo.com', name: 'Demo KAM', role: 'KAM', rank: 3 },
  ];

  try {
    // Ensure the KAM value exists in the database enum role_name
    await pool.query("ALTER TYPE role_name ADD VALUE IF NOT EXISTS 'KAM'");

    await pool.query('BEGIN');

    // 1. Insert roles if not exists
    for (const role of roles) {
      await pool.query(
        `INSERT INTO roles (name) VALUES ($1) ON CONFLICT (name) DO NOTHING`,
        [role]
      );
    }

    // 2. Reassign users with other roles to MANAGER
    await pool.query(
      `UPDATE users
          SET role_id = (SELECT id FROM roles WHERE name = 'MANAGER')
        WHERE role_id NOT IN (
          SELECT id FROM roles WHERE name IN ('ADMIN', 'MANAGER', 'KAM')
        )`
    );

    // 3. Remove other roles from the roles table
    await pool.query(
      `DELETE FROM roles WHERE name NOT IN ('ADMIN', 'MANAGER', 'KAM')`
    );

    // 4. Insert demo users
    for (const u of demoUsers) {
      // Find role ID
      const rRes = await pool.query('SELECT id FROM roles WHERE name = $1', [u.role]);
      const roleId = rRes.rows[0].id;

      await pool.query(
        `INSERT INTO users (email, password_hash, name, role_id, rank, is_active)
         VALUES ($1, $2, $3, $4, $5, TRUE)
         ON CONFLICT (email) DO UPDATE
         SET password_hash = EXCLUDED.password_hash,
             name = EXCLUDED.name,
             role_id = EXCLUDED.role_id,
             rank = EXCLUDED.rank,
             is_active = TRUE`,
        [u.email, 'changeme', u.name, roleId, u.rank]
      );
      console.log(`Seeded user: ${u.email} (${u.role})`);
    }

    await pool.query('COMMIT');
    console.log('Successfully seeded all demo users.');
  } catch (err) {
    await pool.query('ROLLBACK');
    console.error('Seeding failed:', err);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
