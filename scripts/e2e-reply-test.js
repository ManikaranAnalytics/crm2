/**
 * End-to-end test: any authorized user can reply, query becomes DONE (CLOSED).
 * Usage: node scripts/e2e-reply-test.js [queryId] [authorUserId]
 */
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

function readDatabaseUrl() {
  const env = fs.readFileSync(path.join(__dirname, '..', '.env.local'), 'utf8');
  return env.match(/DATABASE_URL=(.+)/)[1].trim();
}

async function main() {
  const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
  const client = new Client({ connectionString: readDatabaseUrl() });
  await client.connect();

  let queryId = Number(process.argv[2]);
  let authorId = Number(process.argv[3]);

  if (!queryId || Number.isNaN(queryId)) {
    const row = await client.query(
      `SELECT id, query_code, responsibility_to_id, raised_by_id
         FROM queries
        WHERE current_status <> 'CLOSED'
          AND responsibility_to_id IS NOT NULL
        ORDER BY id DESC
        LIMIT 1`,
    );
    if (!row.rows[0]) throw new Error('No active query found for test');
    queryId = row.rows[0].id;
    console.log('Using query', row.rows[0].query_code, 'assigned to user', row.rows[0].responsibility_to_id);
  }

  if (!authorId || Number.isNaN(authorId)) {
    const assignee = await client.query(
      `SELECT responsibility_to_id FROM queries WHERE id = $1`,
      [queryId],
    );
    const assigneeId = assignee.rows[0]?.responsibility_to_id;
    const alt = await client.query(
      `SELECT u.id, u.name, r.name AS role
         FROM users u
         JOIN roles r ON r.id = u.role_id
        WHERE u.is_active
          AND r.name IN ('ADMIN', 'EMPLOYEE', 'MANAGER', 'GM')
          AND u.id <> $1
        ORDER BY u.id
        LIMIT 1`,
      [assigneeId],
    );
    if (!alt.rows[0]) throw new Error('No alternate authorized user found');
    authorId = alt.rows[0].id;
    console.log('Reply author (non-assignee):', alt.rows[0].name, alt.rows[0].role);
  }

  const before = await client.query(
    `SELECT current_status, closed_date FROM queries WHERE id = $1`,
    [queryId],
  );
  console.log('BEFORE', before.rows[0]);

  const summaryBefore = await client.query(
    `SELECT COUNT(*)::int AS active_assignments
       FROM queries
      WHERE responsibility_to_id IS NOT NULL
        AND current_status <> 'CLOSED'`,
  );
  console.log('ACTIVE_ASSIGNMENTS_BEFORE', summaryBefore.rows[0].active_assignments);

  const res = await fetch(`${baseUrl}/api/queries/replies`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-actor-id': String(authorId),
    },
    body: JSON.stringify({
      queryId,
      body: `E2E test reply at ${new Date().toISOString()}`,
    }),
  });
  const body = await res.json();
  console.log('REPLY_STATUS', res.status);
  console.log('REPLY_BODY', JSON.stringify(body, null, 2));
  if (!res.ok) {
    process.exitCode = 1;
    return;
  }

  const after = await client.query(
    `SELECT current_status, closed_date, raised_by_id FROM queries WHERE id = $1`,
    [queryId],
  );
  console.log('AFTER', after.rows[0]);

  const summaryAfter = await client.query(
    `SELECT COUNT(*)::int AS active_assignments
       FROM queries
      WHERE responsibility_to_id IS NOT NULL
        AND current_status <> 'CLOSED'`,
  );
  console.log('ACTIVE_ASSIGNMENTS_AFTER', summaryAfter.rows[0].active_assignments);

  const notif = await client.query(
    `SELECT title, message FROM notifications
      WHERE query_id = $1 AND user_id = $2
      ORDER BY created_at DESC LIMIT 1`,
    [queryId, after.rows[0].raised_by_id],
  );
  console.log('KAM_NOTIFICATION', notif.rows[0]);

  const assignRes = await fetch(`${baseUrl}/api/queries/assign?actorId=${authorId}`, {
    headers: { 'x-actor-id': String(authorId) },
  });
  const assignBody = await assignRes.json();
  const stillListed = (assignBody.queries || []).some((q) => q.id === queryId);
  console.log('STILL_IN_ACTIVE_QUEUE', stillListed);

  const pass =
    after.rows[0].current_status === 'CLOSED' &&
    after.rows[0].closed_date &&
    body.message === 'Query Resolved' &&
    !stillListed &&
    summaryAfter.rows[0].active_assignments < summaryBefore.rows[0].active_assignments;

  console.log(pass ? 'E2E_TEST_PASSED' : 'E2E_TEST_FAILED');
  if (!pass) process.exitCode = 1;

  await client.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
