import type { NextApiRequest, NextApiResponse } from 'next';
import { getSessionUser } from '../../../lib/auth/session';
import { query } from '../../../lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end('Method Not Allowed');
  }

  const user = await getSessionUser(req);
  if (!user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  if (!['ADMIN', 'MANAGER', 'KAM'].includes(user.role)) {
    return res.status(403).json({ error: 'Not authorized' });
  }

  const scopeParam = Array.isArray(req.query.scope) ? req.query.scope[0] : req.query.scope;
  const scope = scopeParam === 'my' ? 'my' : 'all';

  try {
    const params: number[] = [];
    const conditions: string[] = [
      `(
         EXISTS (SELECT 1 FROM query_replies r WHERE r.query_id = q.id)
         OR q.current_status = 'CLOSED'
       )`,
    ];

    if (scope === 'my') {
      params.push(user.id);
      conditions.push(`q.raised_by_id = $${params.length}`);
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`;

    const result = await query<{
      query_id: number;
      query_code: string;
      current_status: string;
      state: string | null;
      capacity_mw: string | null;
      technology: string | null;
      transmission_type: string | null;
      period_of_issue: string | null;
      query_raised_date: string | null;
      query_entry_date: string | null;
      query_created_at: string | null;
      pss_text: string | null;
      raised_by: string | null;
      raised_by_id: number | null;
      client_name: string | null;
      reply_id: number | null;
      reply_body: string | null;
      replied_at: string | null;
      replied_by: string | null;
      replied_by_id: number | null;
      replied_by_role: string | null;
      attachment_name: string | null;
      attachment_url: string | null;
    }>(
      `SELECT q.id AS query_id,
              q.query_code,
              q.current_status,
              q.state,
              q.capacity_mw,
              q.technology::text AS technology,
              q.transmission_type,
              q.period_of_issue,
              q.query_raised_date,
              q.query_entry_date,
              q.created_at AS query_created_at,
              q.pss_text,
              q.raised_by,
              q.raised_by_id,
              c.name AS client_name,
              latest.reply_id,
              latest.reply_body,
              latest.replied_at,
              latest.replied_by,
              latest.replied_by_id,
              latest.replied_by_role,
              latest.attachment_name,
              latest.attachment_url
         FROM queries q
         LEFT JOIN clients c ON c.id = q.client_id
         LEFT JOIN LATERAL (
           SELECT r.id AS reply_id,
                  r.body AS reply_body,
                  r.created_at AS replied_at,
                  u.name AS replied_by,
                  u.id AS replied_by_id,
                  roles.name AS replied_by_role,
                  a.file_name AS attachment_name,
                  a.file_path AS attachment_url
             FROM query_replies r
             JOIN users u ON u.id = r.author_id
             JOIN roles ON roles.id = u.role_id
             LEFT JOIN attachments a ON a.id = r.attachment_id
            WHERE r.query_id = q.id
            ORDER BY r.created_at DESC
            LIMIT 1
         ) latest ON TRUE
         ${whereClause}
         ORDER BY COALESCE(latest.replied_at, q.closed_date, q.created_at) DESC
         LIMIT 200`,
      params,
    );

    const replies = result.rows.map((row) => ({
      query_id: row.query_id,
      query_code: row.query_code,
      current_status: row.current_status,
      state: row.state ?? undefined,
      capacity_mw: row.capacity_mw != null ? Number(row.capacity_mw) : undefined,
      technology: row.technology ?? undefined,
      transmission_type: row.transmission_type ?? undefined,
      period_of_issue: row.period_of_issue ?? undefined,
      query_raised_date: row.query_raised_date ?? undefined,
      query_entry_date: row.query_entry_date ?? undefined,
      query_created_at: row.query_created_at ?? undefined,
      pss_text: row.pss_text ?? undefined,
      raised_by: row.raised_by ?? undefined,
      raised_by_id: row.raised_by_id ?? undefined,
      client_name: row.client_name ?? undefined,
      reply_id: row.reply_id ?? undefined,
      reply_body: row.reply_body ?? undefined,
      replied_at: row.replied_at ?? undefined,
      replied_by: row.replied_by ?? undefined,
      replied_by_id: row.replied_by_id ?? undefined,
      replied_by_role: row.replied_by_role ?? undefined,
      attachment_name: row.attachment_name ?? undefined,
      attachment_url: row.attachment_url ?? undefined,
    }));

    return res.status(200).json({ replies });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to load tickets';
    return res.status(500).json({ error: message });
  }
}
