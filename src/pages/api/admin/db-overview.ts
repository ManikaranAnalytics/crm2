import type { NextApiRequest, NextApiResponse } from 'next';
import { query } from '../../../lib/db';

import { getSessionUser } from '../../../lib/auth/session';

interface DbOverviewRow {
  roles: number;
  users: number;
  clients: number;
  client_pss: number;
  queries: number;
  attachments: number;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const user = await getSessionUser(req);
  if (!user || user.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Forbidden' });
  }
  try {
    const result = await query<DbOverviewRow>(
      `SELECT
         (SELECT COUNT(*)::int FROM roles) AS roles,
         (SELECT COUNT(*)::int FROM users) AS users,
         (SELECT COUNT(*)::int FROM clients) AS clients,
         (SELECT COUNT(*)::int FROM client_pss) AS client_pss,
         (SELECT COUNT(*)::int FROM queries) AS queries,
         (SELECT COUNT(*)::int FROM attachments) AS attachments`,
    );

    return res.status(200).json(result.rows[0]);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to load DB overview' });
  }
}

