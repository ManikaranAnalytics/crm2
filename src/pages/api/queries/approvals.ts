import type { NextApiRequest, NextApiResponse } from 'next';
import { query } from '../../../lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'PATCH') {
    res.setHeader('Allow', ['PATCH']);
    return res.status(405).end('Method Not Allowed');
  }

	  const { id, decision, comment } = req.body || {};
  const approvalId = Number(id);

  if (!approvalId || Number.isNaN(approvalId)) {
    return res.status(400).json({ error: 'Valid id is required' });
  }

  if (decision !== 'APPROVED' && decision !== 'REJECTED') {
    return res
      .status(400)
      .json({ error: "decision must be either 'APPROVED' or 'REJECTED'" });
  }

  try {
	    const approvalResult = await query<{
	      id: number;
	      query_id: number;
	      new_status: string;
	    }>(
	      `UPDATE query_approvals
	         SET decision = $2,
	             comment = $3,
	             decided_at = now()
	       WHERE id = $1
	       RETURNING id, query_id, new_status`,
	      [approvalId, decision, comment ?? null],
	    );

	    const approval = approvalResult.rows[0];
	    if (!approval) {
	      return res.status(404).json({ error: 'Approval request not found' });
	    }

	    // If this approval is for closing a query, update the query's closed_date or revert status
	    if (approval.new_status === 'CLOSED') {
	      if (decision === 'APPROVED') {
	        await query(
	          `UPDATE queries
	             SET closed_date = now(),
	                 updated_at = now()
	           WHERE id = $1`,
	          [approval.query_id],
	        );
	      } else if (decision === 'REJECTED') {
	        await query(
	          `UPDATE queries
	             SET current_status = 'OPEN',
	                 close_request_date = NULL,
	                 updated_at = now()
	           WHERE id = $1`,
	          [approval.query_id],
	        );
	      }
	    }

	    return res.status(200).json({ ok: true });
  } catch (err: any) {
    return res.status(400).json({ error: err.message || 'Failed to update approval' });
  }
}

