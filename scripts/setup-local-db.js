const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const EmbeddedPostgres = require('embedded-postgres').default;
const { Client } = require('pg');

const ROOT = path.join(__dirname, '..');
const DB_DIR = path.join(ROOT, '.local-postgres');
const ENV_FILE = path.join(ROOT, '.env.local');
const DB_NAME = 'crm_portal';
const DB_USER = 'postgres';
const DB_PASSWORD = 'postgres';
const DB_PORT = 54322;
const DATABASE_URL = `postgresql://${DB_USER}:${DB_PASSWORD}@127.0.0.1:${DB_PORT}/${DB_NAME}`;

function ensureEnvFile() {
  fs.writeFileSync(ENV_FILE, `DATABASE_URL=${DATABASE_URL}\n`, 'utf8');
  console.log(`Wrote ${path.basename(ENV_FILE)}`);
}

async function main() {
  const pg = new EmbeddedPostgres({
    databaseDir: DB_DIR,
    user: DB_USER,
    password: DB_PASSWORD,
    port: DB_PORT,
    persistent: true,
  });

  console.log('Starting local PostgreSQL...');
  if (!fs.existsSync(path.join(DB_DIR, 'PG_VERSION'))) {
    await pg.initialise();
  }
  await pg.start();

  const adminClient = pg.getPgClient('postgres');
  await adminClient.connect();
  const databaseCheck = await adminClient.query(
    'SELECT 1 FROM pg_database WHERE datname = $1',
    [DB_NAME],
  );
  await adminClient.end();

  if (databaseCheck.rowCount === 0) {
    await pg.createDatabase(DB_NAME);
    console.log(`Created database ${DB_NAME}`);
  }

  ensureEnvFile();

  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();

  const tableCheck = await client.query(
    "SELECT to_regclass('public.users') AS users_table",
  );
  await client.end();

  if (!tableCheck.rows[0]?.users_table) {
    console.log('Importing schema and seed data...');
    const result = spawnSync(
      process.execPath,
      [
        path.join(__dirname, 'deploy-db.js'),
        DATABASE_URL,
        path.join(ROOT, 'crm_portal_dump_clean.sql'),
      ],
      { stdio: 'inherit', cwd: ROOT },
    );

    if (result.status !== 0) {
      await pg.stop();
      process.exit(result.status || 1);
    }
  } else {
    console.log('Database already initialized; skipping schema import.');
  }

  await pg.stop();
  console.log('Local database setup complete.');
}

main().catch(async (error) => {
  console.error('Failed to set up local database:', error);
  process.exit(1);
});
