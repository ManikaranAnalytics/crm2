const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const EmbeddedPostgres = require('embedded-postgres').default;

const ROOT = path.join(__dirname, '..');
const DB_DIR = path.join(ROOT, '.local-postgres');
const ENV_FILE = path.join(ROOT, '.env.local');
const DB_NAME = 'crm_portal';
const DB_USER = 'postgres';
const DB_PASSWORD = 'postgres';
const DB_PORT = 54322;
const DATABASE_URL = `postgresql://${DB_USER}:${DB_PASSWORD}@127.0.0.1:${DB_PORT}/${DB_NAME}`;

let pg;
let nextProcess;

async function startDatabase() {
  pg = new EmbeddedPostgres({
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

  fs.writeFileSync(ENV_FILE, `DATABASE_URL=${DATABASE_URL}\n`, 'utf8');
}

function startNextDev() {
  const nextBin = path.join(
    ROOT,
    'node_modules',
    'next',
    'dist',
    'bin',
    'next',
  );

  nextProcess = spawn(process.execPath, [nextBin, 'dev'], {
    cwd: ROOT,
    stdio: 'inherit',
    env: {
      ...process.env,
      DATABASE_URL,
    },
  });

  nextProcess.on('exit', async (code) => {
    await shutdown(code || 0);
  });
}

async function shutdown(exitCode = 0) {
  if (nextProcess && !nextProcess.killed) {
    nextProcess.kill();
  }

  if (pg) {
    try {
      await pg.stop();
    } catch (error) {
      console.error('Failed to stop PostgreSQL:', error);
    }
  }

  process.exit(exitCode);
}

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));

async function main() {
  await startDatabase();
  console.log(`Database ready at ${DATABASE_URL}`);
  startNextDev();
}

main().catch(async (error) => {
  console.error('Failed to start development environment:', error);
  await shutdown(1);
});
