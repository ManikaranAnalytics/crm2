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

  try {
    const params: number[] = [];
    let whereClause = '';

    if (user.role === 'KAM') {
      whereClause = 'WHERE q.raised_by_id = $1';
      params.push(user.id);
    }

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
      pss_text: string | null;
      raised_by: string | null;
      client_name: string | null;
      reply_id: number;
      reply_body: string;
      replied_at: string;
      replied_by: string;
      replied_by_role: string;
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
              q.pss_text,
              q.raised_by,
              c.name AS client_name,
              r.id AS reply_id,
              r.body AS reply_body,
              r.created_at AS replied_at,
              u.name AS replied_by,
              roles.name AS replied_by_role,
              a.file_name AS attachment_name,
              a.file_path AS attachment_url
         FROM query_replies r
         JOIN queries q ON q.id = r.query_id
         LEFT JOIN clients c ON c.id = q.client_id
         JOIN users u ON u.id = r.author_id
         JOIN roles ON roles.id = u.role_id
         LEFT JOIN attachments a ON a.id = r.attachment_id
         ${whereClause}
         ORDER BY r.created_at DESC
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
      pss_text: row.pss_text ?? undefined,
      raised_by: row.raised_by ?? undefined,
      client_name: row.client_name ?? undefined,
      reply_id: row.reply_id,
      reply_body: row.reply_body,
      replied_at: row.replied_at,
      replied_by: row.replied_by,
      replied_by_role: row.replied_by_role,
      attachment_name: row.attachment_name ?? undefined,
      attachment_url: row.attachment_url ?? undefined,
    }));

    return res.status(200).json({ replies });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to load replies inbox';
    return res.status(500).json({ error: message });
  }
}
