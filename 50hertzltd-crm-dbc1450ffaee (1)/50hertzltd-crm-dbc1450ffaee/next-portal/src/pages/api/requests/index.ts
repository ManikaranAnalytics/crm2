import type { NextApiRequest, NextApiResponse } from 'next';
import { query } from '../../../lib/db';
import { getSessionUser } from '../../../lib/auth/session';

interface QueryApprovalRowDb {
		  id: number;
		  query_id: number;
		  query_code: string;
		  client_name: string | null;
		  pss_text: string | null;
		  state: string | null;
		  capacity_mw: string | null;
		  technology: string | null;
		  transmission_type: string | null;
			  period_of_issue: string | null;
			  issue: string;
			  responsibility_to: string | null;
			  query_entry_date: string | null;
			  query_raised_date: string | null;
		  close_request_date: string | null;
		  closed_date: string | null;
		  current_status: string;
		  new_status: string;
		  requested_by: number;
		  requested_by_name: string | null;
		  approver_name: string | null;
		  decision: string;
		  created_at: string;
		  decided_at: string | null;
		  comment: string | null;
		  attachment_file_name: string | null;
		  attachment_file_path: string | null;
		  attachment_uploaded_at: string | null;
	}

type AttachmentKind = 'CLIENT' | 'SOLUTION';

interface QueryApprovalSummary {
		  id: number;
		  queryId: number;
		  queryCode: string;
		  clientName?: string;
		  pss?: string;
		  state?: string;
		  capacityMw?: number;
		  technology?: string;
		  transmissionType?: string;
		  periodOfIssue?: string;
			  issue: string;
			  responsibilityTo?: string;
			  queryEntryDate?: string;
			  queryAssignDate?: string;
		  closeRequestDate?: string;
		  closedDate?: string;
		  currentStatus: string;
		  newStatus: string;
		  requestedById: number;
		  requestedByName?: string;
		  approverName?: string;
		  decision: string;
		  createdAt: string;
		  decidedAt?: string;
		  comment?: string;
		  attachments: { fileName: string; url: string; kind: AttachmentKind }[];
	}

interface QueryApprovalSummaryInternal
		  extends Omit<QueryApprovalSummary, 'attachments'> {
		  attachments: { fileName: string; url: string; uploadedAt: string | null }[];
	}

function classifyAttachments(
		  attachments: { fileName: string; url: string; uploadedAt: string | null }[],
		): { fileName: string; url: string; kind: AttachmentKind }[] {
		  if (attachments.length === 0) return [];
		  const sorted = [...attachments].sort((a, b) => {
		    if (!a.uploadedAt && !b.uploadedAt) return 0;
		    if (!a.uploadedAt) return 1;
		    if (!b.uploadedAt) return -1;
		    const at = Date.parse(a.uploadedAt);
		    const bt = Date.parse(b.uploadedAt);
		    return at - bt;
		  });
		  return sorted.map((att, idx) => ({
		    fileName: att.fileName,
		    url: att.url,
		    kind: idx === 0 ? 'CLIENT' : 'SOLUTION',
		  }));
	}

function mapAndGroup(rows: QueryApprovalRowDb[]): QueryApprovalSummary[] {
		  const byId = new Map<number, QueryApprovalSummaryInternal>();
		  for (const row of rows) {
		    let item = byId.get(row.id);
		    if (!item) {
			      item = {
		        id: row.id,
		        queryId: row.query_id,
		        queryCode: row.query_code,
		        clientName: row.client_name ?? undefined,
		        pss: row.pss_text ?? undefined,
		        state: row.state ?? undefined,
		        capacityMw: row.capacity_mw == null ? undefined : Number(row.capacity_mw),
		        technology: row.technology ?? undefined,
		        transmissionType: row.transmission_type ?? undefined,
			        periodOfIssue: row.period_of_issue ?? undefined,
			        issue: row.issue,
			        responsibilityTo: row.responsibility_to ?? undefined,
			        queryEntryDate: row.query_entry_date ?? undefined,
			        queryAssignDate: row.query_raised_date ?? undefined,
		        closeRequestDate: row.close_request_date ?? undefined,
		        closedDate: row.closed_date ?? undefined,
		        currentStatus: row.current_status,
		        newStatus: row.new_status,
		        requestedById: row.requested_by,
		        requestedByName: row.requested_by_name ?? undefined,
		        approverName: row.approver_name ?? undefined,
		        decision: row.decision,
		        createdAt: row.created_at,
		        decidedAt: row.decided_at ?? undefined,
		        comment: row.comment ?? undefined,
		        attachments: [],
		      };
		      byId.set(row.id, item);
		    }
		    if (row.attachment_file_name && row.attachment_file_path) {
		      item.attachments.push({
		        fileName: row.attachment_file_name,
		        url: row.attachment_file_path,
		        uploadedAt: row.attachment_uploaded_at,
		      });
		    }
		  }
		  const internals = Array.from(byId.values());
		  return internals.map((item) => ({
		    ...item,
		    attachments: classifyAttachments(item.attachments),
		  }));
	}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
	  if (req.method !== 'GET') {
	    res.setHeader('Allow', ['GET']);
	    return res.status(405).end('Method Not Allowed');
	  }

			// Backend session is not fully wired yet; try normal session first, then
			// fall back to an explicit userId/email passed from the frontend.
			let user = await getSessionUser(req);
			if (!user) {
				const userIdParam = Array.isArray(req.query.userId) ? req.query.userId[0] : req.query.userId;
				const emailParam = Array.isArray(req.query.email) ? req.query.email[0] : req.query.email;
				const idFromQuery = userIdParam ? Number(userIdParam) : NaN;
				const emailFromQuery = typeof emailParam === 'string' ? emailParam : undefined;

				if (!Number.isNaN(idFromQuery) && idFromQuery > 0 && emailFromQuery) {
					try {
						const result = await query<{
							id: number;
							email: string;
							name: string | null;
							role_name: string;
						}>(
							`SELECT u.id, u.email, u.name, r.name AS role_name
							   FROM users u
							   JOIN roles r ON r.id = u.role_id
							  WHERE u.id = $1 AND u.email = $2`,
							[idFromQuery, emailFromQuery],
						);
						const row = result.rows[0];
						if (row) {
							user = {
								id: row.id,
								email: row.email,
								name: row.name || row.email,
								role: row.role_name as any,
							};
						}
					} catch (e) {
						// Fallback failed; will return 401 below.
					}
				}
			}

			if (!user) {
				return res.status(401).json({ error: 'Unauthorized' });
			}

	  try {
	    const myResult = await query<QueryApprovalRowDb>(
	      `SELECT qa.id,
	              qa.query_id,
	              q.query_code,
	              c.name AS client_name,
	              q.pss_text,
	              q.state,
	              q.capacity_mw,
	              q.technology::text AS technology,
	              q.transmission_type,
		              q.period_of_issue,
		              q.issue,
		              q.responsibility_to,
		              q.query_entry_date,
		              q.query_raised_date,
	              q.close_request_date,
	              q.closed_date,
	              q.current_status,
	              qa.new_status,
	              qa.requested_by,
	              rb.name AS requested_by_name,
	              ap.name AS approver_name,
	              qa.decision,
	              qa.created_at,
	              qa.decided_at,
	              qa.comment,
		              a.file_name AS attachment_file_name,
		              a.file_path AS attachment_file_path,
		              a.uploaded_at AS attachment_uploaded_at
	         FROM query_approvals qa
	         JOIN queries q ON q.id = qa.query_id
	         LEFT JOIN clients c ON c.id = q.client_id
	         LEFT JOIN users rb ON rb.id = qa.requested_by
	         LEFT JOIN users ap ON ap.id = qa.approver_id
	         LEFT JOIN attachments a
	                ON a.owner_type = 'QUERY' AND a.owner_id = q.id
	        WHERE qa.requested_by = $1
	        ORDER BY qa.created_at DESC`,
	      [user.id],
	    );

	    const myApprovals = mapAndGroup(myResult.rows);

	    let pendingApprovals: QueryApprovalSummary[] = [];
	    // Query approvals to action are reserved for Himanshu / CRM Head
	    if (user.email === 'himanshu.s@manikarananalytics.in') {
			      const pendingResult = await query<QueryApprovalRowDb>(
		        `SELECT qa.id,
		                qa.query_id,
		                q.query_code,
		                c.name AS client_name,
		                q.pss_text,
		                q.state,
		                q.capacity_mw,
		                q.technology::text AS technology,
		                q.transmission_type,
		                q.period_of_issue,
		                q.issue,
		                q.responsibility_to,
		                q.query_entry_date,
		                q.query_raised_date,
		                q.close_request_date,
		                q.closed_date,
		                q.current_status,
		                qa.new_status,
		                qa.requested_by,
		                rb.name AS requested_by_name,
		                ap.name AS approver_name,
		                qa.decision,
		                qa.created_at,
		                qa.decided_at,
		                qa.comment,
			                a.file_name AS attachment_file_name,
			                a.file_path AS attachment_file_path,
			                a.uploaded_at AS attachment_uploaded_at
		           FROM query_approvals qa
		           JOIN queries q ON q.id = qa.query_id
		           LEFT JOIN clients c ON c.id = q.client_id
		           LEFT JOIN users rb ON rb.id = qa.requested_by
		           LEFT JOIN users ap ON ap.id = qa.approver_id
		           LEFT JOIN attachments a
		                  ON a.owner_type = 'QUERY' AND a.owner_id = q.id
		          WHERE qa.decision = 'PENDING' AND qa.approver_id = $1
		          ORDER BY qa.created_at DESC`,
		        [user.id],
		      );
	      pendingApprovals = mapAndGroup(pendingResult.rows);
	    }

	    return res.status(200).json({ myApprovals, pendingApprovals });
	  } catch (err: any) {
	    return res.status(500).json({ error: err.message || 'Failed to load approval inbox' });
	  }
}
