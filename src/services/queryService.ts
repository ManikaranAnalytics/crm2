// Query service: business logic for creating and listing queries
// This implementation talks directly to Postgres using the `pg` driver.

import { query } from '../lib/db';
import { pickAutoAssignee } from './assignmentService';
import { notifyQueryAssigned, notifyQueryReply } from './notificationService';

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
  responsibilityToId?: number;
  queryAssignDate?: string;
  raisedBy?: string;
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

  let clientId = input.clientId;
  if (!clientId && input.clientName && input.clientName.trim()) {
    const clientTrimmed = input.clientName.trim();
    const existingClient = await query<{ id: number }>(
      `SELECT id FROM clients WHERE UPPER(name) = UPPER($1) LIMIT 1`,
      [clientTrimmed],
    );
    if (existingClient.rows[0]) {
      clientId = existingClient.rows[0].id;
    } else {
      const newClient = await query<{ id: number }>(
        `INSERT INTO clients (name, is_approved) VALUES ($1, true) RETURNING id`,
        [clientTrimmed],
      );
      clientId = newClient.rows[0]?.id;
    }
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
      clientId ?? null,
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

  let assignedRecord: QueryRecord = {
    id: row.id,
    queryCode: row.query_code,
    clientName: input.clientName,
    state: row.state ?? undefined,
    status: row.current_status,
  };

  if (initialStatus !== 'CLOSED') {
    const assigneeId = await pickAutoAssignee();
    if (assigneeId) {
      assignedRecord = await assignQueryToUser(row.id, assigneeId);
      await notifyQueryAssigned(assigneeId, row.id, row.query_code);
    }
  }

  return assignedRecord;
}

export async function listActiveQueriesForReply(): Promise<QueryRecord[]> {
  const result = await query<{
    id: number;
    query_code: string;
    client_name: string | null;
    state: string | null;
    current_status: string;
    responsibility_to: string | null;
    responsibility_to_id: number | null;
    query_raised_date: string | null;
    raised_by: string | null;
    attachment_file_name: string | null;
    attachment_file_path: string | null;
  }>(
    `SELECT q.id,
            q.query_code,
            c.name AS client_name,
            q.state,
            q.current_status,
            q.responsibility_to,
            q.responsibility_to_id,
            q.query_raised_date,
            q.raised_by,
            a.file_name AS attachment_file_name,
            a.file_path AS attachment_file_path
       FROM queries q
       LEFT JOIN clients c ON q.client_id = c.id
       LEFT JOIN LATERAL (
         SELECT file_name, file_path
           FROM attachments
          WHERE owner_type = 'QUERY' AND owner_id = q.id
          ORDER BY uploaded_at ASC
          LIMIT 1
       ) a ON TRUE
      WHERE q.responsibility_to_id IS NOT NULL
        AND q.current_status <> 'CLOSED'
       ORDER BY q.created_at DESC
       LIMIT 200`,
  );

  return result.rows.map((row) => ({
    id: row.id,
    queryCode: row.query_code,
    clientName: row.client_name ?? undefined,
    state: row.state ?? undefined,
    status: row.current_status,
    responsibilityTo: row.responsibility_to ?? undefined,
    responsibilityToId: row.responsibility_to_id ?? undefined,
    queryAssignDate: row.query_raised_date ?? undefined,
    raisedBy: row.raised_by ?? undefined,
    attachments:
      row.attachment_file_name && row.attachment_file_path
        ? [{ fileName: row.attachment_file_name, url: row.attachment_file_path }]
        : [],
  }));
}

/** @deprecated Use listActiveQueriesForReply */
export async function listAssignedQueriesForReply(options: {
  forUserId: number;
  viewAll?: boolean;
}): Promise<QueryRecord[]> {
  void options;
  return listActiveQueriesForReply();
}

export interface QueryThreadMessage {
  id: string;
  type: 'ORIGINAL' | 'REPLY';
  authorName: string;
  authorRole?: string;
  body: string;
  createdAt: string;
  attachment?: { fileName: string; url: string };
  attachments?: { fileName: string; url: string }[];
}

export interface QueryThread {
  queryId: number;
  queryCode: string;
  issue: string;
  raisedBy?: string;
  assignedTo?: string;
  status: string;
  closedDate?: string;
  originalAttachment?: { fileName: string; url: string };
  messages: QueryThreadMessage[];
  clientName?: string;
  state?: string;
  capacityMw?: number | null;
  technology?: string | null;
  transmissionType?: string | null;
  periodOfIssue?: string | null;
  queryRaisedDate?: string | null;
  pssText?: string | null;
}

export async function getQueryThread(queryId: number): Promise<QueryThread | null> {
  const queryResult = await query<{
    id: number;
    query_code: string;
    issue: string;
    raised_by: string | null;
    responsibility_to: string | null;
    current_status: string;
    closed_date: string | null;
    client_name: string | null;
    state: string | null;
    capacity_mw: string | null;
    technology: string | null;
    transmission_type: string | null;
    period_of_issue: string | null;
    query_raised_date: string | null;
    pss_text: string | null;
    original_file_name: string | null;
    original_file_path: string | null;
  }>(
    `SELECT q.id,
            q.query_code,
            q.issue,
            q.raised_by,
            q.responsibility_to,
            q.current_status,
            q.closed_date,
            c.name AS client_name,
            q.state,
            q.capacity_mw,
            q.technology::text AS technology,
            q.transmission_type,
            q.period_of_issue,
            q.query_raised_date,
            q.pss_text,
            a.file_name AS original_file_name,
            a.file_path AS original_file_path
       FROM queries q
       LEFT JOIN clients c ON c.id = q.client_id
       LEFT JOIN LATERAL (
         SELECT file_name, file_path
           FROM attachments
          WHERE owner_type = 'QUERY' AND owner_id = q.id
          ORDER BY uploaded_at ASC
          LIMIT 1
       ) a ON TRUE
      WHERE q.id = $1`,
    [queryId],
  );

  const row = queryResult.rows[0];
  if (!row) return null;

  const repliesResult = await query<{
    id: number;
    body: string;
    created_at: string;
    author_name: string;
    role_name: string;
    file_name: string | null;
    file_path: string | null;
    multi_file_name: string | null;
    multi_file_path: string | null;
  }>(
    `SELECT r.id,
            r.body,
            r.created_at,
            u.name AS author_name,
            roles.name AS role_name,
            a.file_name,
            a.file_path,
            a2.file_name AS multi_file_name,
            a2.file_path AS multi_file_path
       FROM query_replies r
       JOIN users u ON u.id = r.author_id
       JOIN roles ON roles.id = u.role_id
       LEFT JOIN attachments a ON a.id = r.attachment_id
       LEFT JOIN query_reply_attachments qra ON qra.reply_id = r.id
       LEFT JOIN attachments a2 ON a2.id = qra.attachment_id
      WHERE r.query_id = $1
      ORDER BY r.created_at ASC`,
    [queryId],
  );

  const replyMessages: QueryThreadMessage[] = [];
  const replyIndexById = new Map<number, number>();

  for (const reply of repliesResult.rows) {
    let idx = replyIndexById.get(reply.id);
    if (idx === undefined) {
      idx = replyMessages.length;
      replyIndexById.set(reply.id, idx);
      replyMessages.push({
        id: String(reply.id),
        type: 'REPLY',
        authorName: reply.author_name,
        authorRole: reply.role_name,
        body: reply.body,
        createdAt: reply.created_at,
        attachment:
          reply.file_name && reply.file_path
            ? { fileName: reply.file_name, url: reply.file_path }
            : undefined,
        attachments: [],
      });
    }

    if (reply.multi_file_name && reply.multi_file_path) {
      const msg = replyMessages[idx];
      const att = { fileName: reply.multi_file_name, url: reply.multi_file_path };
      if (!msg.attachments!.some((a) => a.url === att.url && a.fileName === att.fileName)) {
        msg.attachments!.push(att);
      }
    }
  }

  for (const msg of replyMessages) {
    if (!msg.attachments?.length) {
      delete msg.attachments;
    }
  }

  const messages: QueryThreadMessage[] = [
    {
      id: `original-${row.id}`,
      type: 'ORIGINAL',
      authorName: row.raised_by ?? 'Key Access Manager',
      body: row.issue,
      createdAt: '',
      attachment:
        row.original_file_name && row.original_file_path
          ? { fileName: row.original_file_name, url: row.original_file_path }
          : undefined,
    },
    ...replyMessages,
  ];

  return {
    queryId: row.id,
    queryCode: row.query_code,
    issue: row.issue,
    raisedBy: row.raised_by ?? undefined,
    assignedTo: row.responsibility_to ?? undefined,
    status: row.current_status,
    closedDate: row.closed_date ?? undefined,
    clientName: row.client_name ?? undefined,
    state: row.state ?? undefined,
    capacityMw: row.capacity_mw != null ? Number(row.capacity_mw) : null,
    technology: row.technology ?? null,
    transmissionType: row.transmission_type ?? null,
    periodOfIssue: row.period_of_issue ?? null,
    queryRaisedDate: row.query_raised_date ?? null,
    pssText: row.pss_text ?? null,
    originalAttachment:
      row.original_file_name && row.original_file_path
        ? { fileName: row.original_file_name, url: row.original_file_path }
        : undefined,
    messages,
  };
}

export async function createQueryReply(input: {
  queryId: number;
  authorId: number;
  body: string;
  attachmentId?: number;
  attachmentIds?: number[];
}): Promise<{ replyId: number; status: string; closedDate: string }> {
  if (!input.body?.trim()) {
    throw new Error('Reply text is required');
  }

  const queryResult = await query<{
    current_status: string;
    raised_by_id: number | null;
    query_code: string;
  }>(
    `SELECT current_status, raised_by_id, query_code
       FROM queries WHERE id = $1`,
    [input.queryId],
  );

  const queryRow = queryResult.rows[0];
  if (!queryRow) throw new Error('Query not found');
  if (queryRow.current_status === 'CLOSED') {
    throw new Error('This query is already resolved');
  }

  const authorResult = await query<{ name: string; role_name: string }>(
    `SELECT u.name, r.name AS role_name
       FROM users u
       JOIN roles r ON r.id = u.role_id
      WHERE u.id = $1 AND u.is_active = TRUE`,
    [input.authorId],
  );
  const author = authorResult.rows[0];
  if (!author || !['ADMIN', 'MANAGER'].includes(author.role_name)) {
    throw new Error('You are not authorized to reply to queries');
  }

  const insertResult = await query<{ id: number; created_at: string }>(
    `INSERT INTO query_replies (query_id, author_id, body, attachment_id)
     VALUES ($1, $2, $3, $4)
     RETURNING id, created_at`,
    [input.queryId, input.authorId, input.body.trim(), input.attachmentId ?? null],
  );

  const replyRow = insertResult.rows[0];
  const replyId = replyRow.id;

  if (input.attachmentIds?.length) {
    await query(
      `INSERT INTO query_reply_attachments (reply_id, attachment_id)
       SELECT $1, UNNEST($2::int[])`,
      [replyId, input.attachmentIds],
    );
  }

  const closeResult = await query<{ closed_date: string }>(
    `UPDATE queries
        SET current_status = 'CLOSED',
            closed_date = COALESCE(closed_date, now()),
            updated_at = now()
      WHERE id = $1
      RETURNING closed_date`,
    [input.queryId],
  );
  const closedDate = closeResult.rows[0]?.closed_date ?? new Date().toISOString();

  if (queryRow.raised_by_id) {
    await notifyQueryReply(
      queryRow.raised_by_id,
      input.queryId,
      replyId,
      author.name,
      queryRow.query_code,
      input.body.trim(),
      closedDate,
    );
  }

  return { replyId, status: 'CLOSED', closedDate };
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

