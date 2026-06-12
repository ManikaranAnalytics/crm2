const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

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
  const migrationPath = path.join(
    __dirname,
    '..',
    'db',
    'migrations',
    '001_query_replies_notifications.sql',
  );
  const sql = fs.readFileSync(migrationPath, 'utf8');
  const client = new Client({ connectionString });

  try {
    await client.connect();
    console.log('Applying query workflow migration...');
    await client.query(sql);
    console.log('Migration applied successfully.');
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error('Migration failed:', error);
  process.exit(1);
});
