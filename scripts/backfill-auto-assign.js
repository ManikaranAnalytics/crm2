/**
 * Backfill auto-assignment for existing unassigned, non-closed queries.
 * Run after migrate:workflow.
 */
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

const CRM_HEAD_EMAIL = 'himanshu.s@manikarananalytics.in';

function readDatabaseUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  const envPath = path.join(__dirname, '..', '.env.local');
  const env = fs.readFileSync(envPath, 'utf8');
  const match = env.match(/^\s*DATABASE_URL\s*=\s*(.+)\s*$/m);
  if (!match) throw new Error('DATABASE_URL not found');
  return match[1].trim().replace(/^["']|["']$/g, '');
}

async function pickAutoAssignee(client) {
  const { rows } = await client.query(
    `SELECT u.id,
            COUNT(q.id) FILTER (WHERE q.current_status <> 'CLOSED')::int AS workload
       FROM users u
       JOIN roles r ON r.id = u.role_id
       LEFT JOIN queries q ON q.responsibility_to_id = u.id
      WHERE u.is_active = TRUE
        AND LOWER(u.email) <> LOWER($1)
        AND r.name IN ('ADMIN', 'EMPLOYEE', 'MANAGER', 'GM')
      GROUP BY u.id
      ORDER BY workload ASC, u.id ASC`,
    [CRM_HEAD_EMAIL],
  );
  if (!rows.length) return null;

  const minWorkload = rows[0].workload;
  const tied = rows.filter((row) => row.workload === minWorkload);
  if (tied.length === 1) return tied[0].id;

  const state = await client.query(
    `SELECT last_assigned_user_id FROM assignment_state WHERE id = 1`,
  );
  const lastId = state.rows[0]?.last_assigned_user_id ?? null;
  const tiedIds = tied.map((row) => row.id).sort((a, b) => a - b);
  let nextId = tiedIds[0];
  if (lastId) {
    const after = tiedIds.find((id) => id > lastId);
    nextId = after ?? tiedIds[0];
  }

  await client.query(
    `UPDATE assignment_state SET last_assigned_user_id = $1, updated_at = now() WHERE id = 1`,
    [nextId],
  );
  return nextId;
}

async function main() {
  const client = new Client({ connectionString: readDatabaseUrl() });
  await client.connect();

  try {
    const { rows: unassigned } = await client.query(
      `SELECT id, query_code
         FROM queries
        WHERE responsibility_to_id IS NULL
          AND current_status <> 'CLOSED'
        ORDER BY created_at ASC`,
    );

    console.log(`Found ${unassigned.length} unassigned queries to backfill.`);
    for (const queryRow of unassigned) {
      const assigneeId = await pickAutoAssignee(client);
      if (!assigneeId) {
        console.log('No eligible assignees found; stopping.');
        break;
      }

      await client.query(
        `UPDATE queries
            SET responsibility_to_id = $2,
                responsibility_to = (SELECT name FROM users WHERE id = $2),
                query_raised_date = COALESCE(query_raised_date, now()),
                current_status = CASE
                  WHEN current_status = 'CLOSED' THEN current_status
                  ELSE 'IN_PROGRESS'
                END,
                updated_at = now()
          WHERE id = $1`,
        [queryRow.id, assigneeId],
      );

      await client.query(
        `INSERT INTO notifications (user_id, query_id, type, title, message)
         VALUES ($1, $2, 'QUERY_ASSIGNED', $3, $4)`,
        [
          assigneeId,
          queryRow.id,
          'New query assigned',
          `Query ${queryRow.query_code} has been automatically assigned to you.`,
        ],
      );

      console.log(`Assigned ${queryRow.query_code} -> user ${assigneeId}`);
    }
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error('Backfill failed:', error);
  process.exit(1);
});
