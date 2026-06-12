import type { NextApiRequest, NextApiResponse } from 'next';
import { getSessionUser } from '../../../lib/auth/session';
import { listActiveQueriesForReply } from '../../../services/queryService';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    const user = await getSessionUser(req);
    const actorRaw = Array.isArray(req.query.actorId) ? req.query.actorId[0] : req.query.actorId;
    const actorId = user?.id ?? Number(actorRaw);

    if (!actorId || Number.isNaN(actorId)) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    if (!user || !['ADMIN', 'MANAGER'].includes(user.role)) {
      return res.status(403).json({ error: 'You are not authorized to view the reply queue' });
    }

    try {
      const queries = await listActiveQueriesForReply();
      return res.status(200).json({ queries });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load active queries';
      return res.status(500).json({ error: message });
    }
  }

  res.setHeader('Allow', ['GET']);
  return res.status(405).end('Method Not Allowed');
}
