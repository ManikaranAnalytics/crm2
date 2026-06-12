#!/bin/sh
set -e

echo "Waiting for Postgres to start..."
# Wait for postgres to be ready
until nc -z -v -w30 db 5432; do
  echo "Postgres is unavailable - sleeping"
  sleep 2
done

echo "Postgres is up - executing database check"

# Check if database is already initialized
node -e "
const { Client } = require('pg');
const client = new Client({ connectionString: process.env.DATABASE_URL });
client.connect()
  .then(() => client.query(\"SELECT to_regclass('public.users') AS users_table\"))
  .then((res) => {
    if (!res.rows[0]?.users_table) {
      console.log('Database not initialized.');
      process.exit(1);
    } else {
      console.log('Database already initialized.');
      process.exit(0);
    }
  })
  .catch((err) => {
    console.error('Database check error:', err.message);
    process.exit(1);
  });
" || (
  echo "Deploying database schema and clean seed dump..."
  node scripts/deploy-db.js "$DATABASE_URL" crm_portal_dump_clean.sql
  echo "Seeding demo users..."
  node scripts/seed-demo-users.js
)

echo "Starting Next.js App..."
exec "$@"
