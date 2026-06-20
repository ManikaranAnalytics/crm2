const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const EmbeddedPostgres = require('embedded-postgres').default;

const ROOT = path.join(__dirname, '..');
const DB_DIR = path.join(ROOT, '.local-postgres');
const DB_USER = 'postgres';
const DB_PASSWORD = 'postgres';
const DB_PORT = 54322;
const DATABASE_URL = `postgresql://${DB_USER}:${DB_PASSWORD}@127.0.0.1:${DB_PORT}/crm_portal`;

async function main() {
  const pg = new EmbeddedPostgres({
    databaseDir: DB_DIR,
    user: DB_USER,
    password: DB_PASSWORD,
    port: DB_PORT,
    persistent: true,
  });

  console.log('Starting local PostgreSQL for seeding...');
  if (!fs.existsSync(path.join(DB_DIR, 'PG_VERSION'))) {
    await pg.initialise();
  }
  await pg.start();

  console.log('Running user seeding...');
  const result = spawnSync(
    process.execPath,
    [path.join(__dirname, 'seed-demo-users.js')],
    {
      stdio: 'inherit',
      cwd: ROOT,
      env: {
        ...process.env,
        DATABASE_URL,
      },
    }
  );

  await pg.stop();
  console.log('PostgreSQL stopped.');

  if (result.status !== 0) {
    process.exit(result.status || 1);
  }
  console.log('Seeding complete.');
}

main().catch(async (error) => {
  console.error('Failed to seed local database:', error);
  process.exit(1);
});
