import type { NextApiRequest, NextApiResponse } from 'next';
import { getSessionUser, requireRole } from '../../../lib/auth/session';
import { CAN_MANAGE_CLIENTS } from '../../../lib/auth/roles';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const user = await getSessionUser(req);

  if (req.method === 'POST') {
    if (!requireRole(res, user, CAN_MANAGE_CLIENTS)) return;
    // TODO: create client + possibly Request for approval
    return res.status(501).json({ error: 'Client creation not implemented yet' });
  }

  if (req.method === 'GET') {
    // TODO: list clients
    return res.status(200).json({ clients: [] });
  }

  res.setHeader('Allow', ['GET', 'POST']);
  return res.status(405).end('Method Not Allowed');
}

