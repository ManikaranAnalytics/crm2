// Query service: business logic for creating and listing queries
// This implementation talks directly to Postgres using the `pg` driver.

import { query } from '../lib/db';

export const QUERY_STATUS_CODES = [
  'OPEN',
  'IN_PROGRESS',
  'CLOSED',
  'PENDING_FROM_CLIENT',
] as const;

export type QueryStatusCode = (typeof QUERY_STATUS_CODES)[number];

export function isValidQueryStatus(status: string): status is QueryStatusCode {
  return (QUERY_STATUS_CODES as readonly string[]).includes(status);
}

export interface CreateQueryInput {
	  queryCode?: string;
	  clientId?: number;
	  clientName?: string;
	  pssId?: number;
	  pssText?: string;
	  state?: string;
	  capacityMw?: string;
	  technology?: string;
	  transmissionType?: string;
	  issue: string;
	  periodOfIssue?: string;
	  queryEntryDate?: string; // ISO date (yyyy-mm-dd)
	  queryAssignDate?: string; // ISO date (yyyy-mm-dd)
	  /** Optional initial status code, e.g. 'OPEN', 'IN_PROGRESS', 'CLOSED', 'PENDING_FROM_CLIENT' */
	  status?: string;
	  /** Optional metadata about who raised the query */
	  raisedByName?: string;
	  raisedById?: number;
}

	export interface QueryRecord {
		  id: number;
		  queryCode: string;
		  clientName?: string;
			  state?: string;
			  /** Free-text PSS label captured from client_pss at creation time */
			  pss?: string;
			  /** STU/CTU transmission type, if provided */
			  transmissionType?: string;
			  /** Human-readable period of issue, e.g. "2025-01-01 to 2025-01-31" */
			  periodOfIssue?: string;
		  status: string;
		  responsibilityTo?: string;
		  queryAssignDate?: string;
			  attachments?: { fileName: string; url: string }[];
		}

	export async function listQueries(options?: { forUserId?: number }): Promise<QueryRecord[]> {
		  const params: any[] = [];
		  let whereClause = '';

		  if (options?.forUserId) {
		    whereClause = 'WHERE q.responsibility_to_id = $1';
		    params.push(options.forUserId);
		  }

		  const result = await query<{
		    id: number;
		    query_code: string;
		    client_name: string | null;
		    state: string | null;
			    pss_text: string | null;
			    transmission_type: string | null;
		    current_status: string;
		    responsibility_to: string | null;
			    period_of_issue: string | null;
		    query_raised_date: string | null;
		  }>(
		    `SELECT q.id,
		            q.query_code,
		            c.name AS client_name,
			            q.state,
			            q.pss_text,
			            q.transmission_type,
		            q.current_status,
		            q.responsibility_to,
		            q.period_of_issue,
		            q.query_raised_date
		       FROM queries q
		       LEFT JOIN clients c ON q.client_id = c.id
		       ${whereClause}
		       ORDER BY q.created_at DESC
		       LIMIT 200`,
		    params,
		  );

		  return result.rows.map((row) => ({
		    id: row.id,
		    queryCode: row.query_code,
		    clientName: row.client_name ?? undefined,
		    state: row.state ?? undefined,
			    pss: row.pss_text ?? undefined,
			    transmissionType: row.transmission_type ?? undefined,
			    periodOfIssue: row.period_of_issue ?? undefined,
		    status: row.current_status,
		    responsibilityTo: row.responsibility_to ?? undefined,
		    queryAssignDate: row.query_raised_date ?? undefined,
		  }));
	}

		export async function listAssignableQueries(): Promise<QueryRecord[]> {
			  const result = await query<{
		    id: number;
		    query_code: string;
		    client_name: string | null;
		    state: string | null;
		    current_status: string;
		    responsibility_to: string | null;
		    query_raised_date: string | null;
		    attachment_file_name: string | null;
		    attachment_file_path: string | null;
		  }>(
		    `SELECT q.id,
		            q.query_code,
		            c.name AS client_name,
		            q.state,
		            q.current_status,
		            q.responsibility_to,
		            q.query_raised_date,
		            a.file_name AS attachment_file_name,
		            a.file_path AS attachment_file_path
		       FROM queries q
		       LEFT JOIN clients c ON q.client_id = c.id
		       LEFT JOIN attachments a
		              ON a.owner_type = 'QUERY' AND a.owner_id = q.id
		      WHERE q.responsibility_to_id IS NULL
		        AND q.current_status <> 'CLOSED'
		       ORDER BY q.created_at DESC
		       LIMIT 200`,
		  );
		
		  const byId = new Map<
		    number,
		    QueryRecord & { attachments: { fileName: string; url: string }[] }
		  >();
		
		  for (const row of result.rows) {
		    let item = byId.get(row.id);
		    if (!item) {
		      item = {
		        id: row.id,
		        queryCode: row.query_code,
		        clientName: row.client_name ?? undefined,
		        state: row.state ?? undefined,
		        status: row.current_status,
		        responsibilityTo: row.responsibility_to ?? undefined,
		        queryAssignDate: row.query_raised_date ?? undefined,
		        attachments: [],
		      };
		      byId.set(row.id, item);
		    }
		    if (row.attachment_file_name && row.attachment_file_path) {
		      item.attachments.push({
		        fileName: row.attachment_file_name,
		        url: row.attachment_file_path,
		      });
		    }
		  }
		
		  return Array.from(byId.values());
		}

export async function createQuery(input: CreateQueryInput): Promise<QueryRecord> {
	  if (!input.issue) {
    throw new Error('issue is required');
  }

		  const capacity = input.capacityMw ? Number(input.capacityMw) : null;

	  let initialStatus: QueryStatusCode = 'OPEN';
	  if (input.status && isValidQueryStatus(input.status)) {
	    initialStatus = input.status;
	  }

		  const now = new Date();
		  const entryDate = input.queryEntryDate ? new Date(input.queryEntryDate) : now;
		  const assignDate = input.queryAssignDate ? new Date(input.queryAssignDate) : null;
		  const queryCode =
	    input.queryCode && input.queryCode.trim().length > 0
	      ? input.queryCode.trim()
	      : `Q${Date.now()}`;

  const result = await query<{
    id: number;
    query_code: string;
    state: string | null;
    current_status: string;
	  }>(
	    `INSERT INTO queries (
	       query_code,
	       client_id,
	       pss_id,
	       pss_text,
	       state,
	       capacity_mw,
	       technology,
	       transmission_type,
	       period_of_issue,
	       issue,
	       query_entry_date,
	       query_raised_date,
	       raised_by,
	       raised_by_id,
	       current_status
	     ) VALUES ($1, $2, $3, $4, $5, $6, $7::technology, $8, $9, $10, $11, $12, $13, $14, $15)
	     RETURNING id, query_code, state, current_status`,
	    [
	      queryCode,
	      input.clientId ?? null,
	      input.pssId ?? null,
	      input.pssText ?? null,
	      input.state ?? null,
	      capacity,
	      input.technology ?? null,
	      input.transmissionType ?? null,
	      input.periodOfIssue ?? null,
	      input.issue,
	      entryDate,
	      assignDate,
	      input.raisedByName ?? null,
	      input.raisedById ?? null,
	      initialStatus,
	    ],
	  );

  const row = result.rows[0];

	  // If the query is created directly in CLOSED status, automatically
	  // create an approval request for Himanshu and stamp the
	  // close_request_date so the workflow matches manual closures.
	  if (initialStatus === 'CLOSED' && input.raisedById) {
	    await query(
	      `UPDATE queries
	          SET close_request_date = COALESCE(close_request_date, now()),
	              updated_at = now()
	        WHERE id = $1`,
	      [row.id],
	    );

	    const approverResult = await query<{ id: number }>(
	      `SELECT id FROM users WHERE email = $1 LIMIT 1`,
	      ['himanshu.s@manikarananalytics.in'],
	    );
	    const approverId = approverResult.rows[0]?.id;
	    if (approverId) {
	      await query(
	        `INSERT INTO query_approvals (query_id, new_status, requested_by, approver_id)
	         VALUES ($1, 'CLOSED', $2, $3)`,
	        [row.id, input.raisedById, approverId],
	      );
	    }
	  }

	  return {
	    id: row.id,
	    queryCode: row.query_code,
	    clientName: input.clientName,
	    state: row.state ?? undefined,
	    status: row.current_status,
	  };
}

export async function assignQueryToUser(
	  queryId: number,
	  assigneeUserId: number,
): Promise<QueryRecord> {
	  if (!queryId || Number.isNaN(queryId)) {
	    throw new Error('A valid query id is required');
	  }
	  if (!assigneeUserId || Number.isNaN(assigneeUserId)) {
	    throw new Error('A valid assignee user id is required');
	  }

	  const updateResult = await query<{
	    id: number;
	    query_code: string;
	    state: string | null;
	    current_status: string;
	    responsibility_to: string | null;
	    query_raised_date: string | null;
	  }>(
	    `UPDATE queries
	       SET responsibility_to_id = $2,
	           responsibility_to = (SELECT name FROM users WHERE id = $2),
	           query_raised_date = COALESCE(query_raised_date, now()),
	           current_status = CASE
	             WHEN current_status = 'CLOSED' THEN current_status
	             ELSE 'IN_PROGRESS'
	           END,
	           updated_at = now()
	     WHERE id = $1
	     RETURNING id, query_code, state, current_status, responsibility_to, query_raised_date`,
	    [queryId, assigneeUserId],
	  );

	  const row = updateResult.rows[0];
	  if (!row) {
	    throw new Error('Query not found');
	  }

	  return {
	    id: row.id,
	    queryCode: row.query_code,
	    clientName: undefined,
	    state: row.state ?? undefined,
	    status: row.current_status,
	    responsibilityTo: row.responsibility_to ?? undefined,
	    queryAssignDate: row.query_raised_date ?? undefined,
	  };
}

export async function updateQueryStatusWithApproval(
	  queryId: number,
	  newStatus: QueryStatusCode,
	  requestedById: number,
	  options?: { remark?: string | null },
	): Promise<QueryRecord> {
  if (!queryId || Number.isNaN(queryId)) {
    throw new Error('A valid query id is required');
  }

  // Ensure the query exists and update its status
  const updateResult = await query<{
    id: number;
    query_code: string;
    state: string | null;
    current_status: string;
  }>(
	    `UPDATE queries
	       SET current_status = $2,
	           updated_at = now(),
	           close_request_date = CASE
	             WHEN $2 = 'CLOSED' THEN COALESCE(close_request_date, now())
	             ELSE close_request_date
	           END
	     WHERE id = $1
	     RETURNING id, query_code, state, current_status`,
    [queryId, newStatus],
  );

  const updated = updateResult.rows[0];
  if (!updated) {
    throw new Error('Query not found');
  }

  // Resolve approver (Himanshu) from the users table
  const approverResult = await query<{ id: number }>(
    `SELECT id FROM users WHERE email = $1 LIMIT 1`,
    ['himanshu.s@manikarananalytics.in'],
  );

  const approverId = approverResult.rows[0]?.id;
  if (!approverId) {
    throw new Error('Approver (Himanshu) not found in users table');
  }

	  // Record an approval request for this status change, including any remark
	  const comment = options?.remark && options.remark.trim().length > 0
	    ? options.remark.trim()
	    : null;
	  await query(
	    `INSERT INTO query_approvals (
	       query_id,
	       new_status,
	       requested_by,
	       approver_id,
	       comment
	     ) VALUES ($1, $2, $3, $4, $5)`,
	    [queryId, newStatus, requestedById, approverId, comment],
	  );

  return {
    id: updated.id,
    queryCode: updated.query_code,
    clientName: undefined,
    state: updated.state ?? undefined,
    status: updated.current_status,
  };
}

