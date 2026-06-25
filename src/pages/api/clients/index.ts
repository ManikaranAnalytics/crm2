import type { NextApiRequest, NextApiResponse } from 'next';
import { getSessionUser } from '../../../lib/auth/session';
import { CAN_MANAGE_QUERIES } from '../../../lib/auth/roles';
import { query } from '../../../lib/db';

interface ClientRow {
  id: number;
  name: string;
  state: string | null;
  is_approved: boolean;
  pss_count?: number;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const user = await getSessionUser(req);
  if (!user || !CAN_MANAGE_QUERIES.includes(user.role)) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end('Method Not Allowed');
  }

  try {
    const result = await query<ClientRow>(
      `SELECT c.id,
              c.name,
              c.state,
              c.is_approved,
              COUNT(p.id)::int AS pss_count
         FROM clients c
         LEFT JOIN client_pss p ON p.client_id = c.id
        GROUP BY c.id
        ORDER BY c.name ASC`,
    );

    return res.status(200).json({
      clients: result.rows.map((row) => ({
        id: row.id,
        name: row.name,
        state: row.state,
        isApproved: row.is_approved,
        pssCount: row.pss_count ?? 0,
      })),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to load clients';
    return res.status(500).json({ error: message });
  }
}
