import { query } from '../lib/db';

interface AssigneeCandidate {
  id: number;
  name: string;
  workload: number;
}

export async function getEligibleAssignees(): Promise<AssigneeCandidate[]> {
  const result = await query<AssigneeCandidate>(
    `SELECT u.id,
            u.name,
            COUNT(q.id) FILTER (WHERE q.current_status <> 'CLOSED')::int AS workload
       FROM users u
       JOIN roles r ON r.id = u.role_id
       LEFT JOIN queries q ON q.responsibility_to_id = u.id
      WHERE u.is_active = TRUE
        AND r.name IN ('EMPLOYEE', 'MANAGER', 'GM')
      GROUP BY u.id, u.name
      ORDER BY workload ASC, u.id ASC`,
    [],
  );
  return result.rows;
}

export async function pickAutoAssignee(): Promise<number | null> {
  const candidates = await getEligibleAssignees();
  if (!candidates.length) return null;

  const minWorkload = candidates[0].workload;
  const tied = candidates.filter((c) => c.workload === minWorkload);
  if (tied.length === 1) return tied[0].id;

  const stateResult = await query<{ last_assigned_user_id: number | null }>(
    `SELECT last_assigned_user_id FROM assignment_state WHERE id = 1`,
  );
  const lastId = stateResult.rows[0]?.last_assigned_user_id ?? null;
  const tiedIds = tied.map((c) => c.id).sort((a, b) => a - b);

  let nextId = tiedIds[0];
  if (lastId) {
    const after = tiedIds.find((id) => id > lastId);
    nextId = after ?? tiedIds[0];
  }

  await query(
    `UPDATE assignment_state
        SET last_assigned_user_id = $1, updated_at = now()
      WHERE id = 1`,
    [nextId],
  );

  return nextId;
}
