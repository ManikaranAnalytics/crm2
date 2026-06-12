const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

async function main() {
  const env = fs.readFileSync(path.join(__dirname, '..', '.env.local'), 'utf8');
  const url = env.match(/DATABASE_URL=(.+)/)[1].trim();
  const client = new Client({ connectionString: url });
  await client.connect();

  const active = await client.query(
    `SELECT id, query_code, responsibility_to_id, current_status, raised_by_id
       FROM queries
      WHERE current_status <> 'CLOSED'
        AND responsibility_to_id IS NOT NULL
      ORDER BY id DESC
      LIMIT 5`,
  );
  console.log('ACTIVE_QUERIES', JSON.stringify(active.rows, null, 2));

  const users = await client.query(
    `SELECT u.id, u.name, u.email, r.name AS role
       FROM users u
       JOIN roles r ON r.id = u.role_id
      WHERE u.is_active`,
  );
  console.log('USERS', JSON.stringify(users.rows, null, 2));

  await client.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
