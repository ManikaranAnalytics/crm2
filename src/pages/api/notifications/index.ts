import type { NextApiRequest, NextApiResponse } from 'next';
import { getSessionUser } from '../../../lib/auth/session';
import {
  countUnreadNotifications,
  listNotifications,
  markNotificationsRead,
} from '../../../services/notificationService';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const user = await getSessionUser(req);
  if (!user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  if (req.method === 'GET') {
    try {
      const [notifications, unreadCount] = await Promise.all([
        listNotifications(user.id),
        countUnreadNotifications(user.id),
      ]);
      return res.status(200).json({ notifications, unreadCount });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load notifications';
      return res.status(500).json({ error: message });
    }
  }

  if (req.method === 'PATCH') {
    const { notificationIds } = req.body || {};
    try {
      await markNotificationsRead(
        user.id,
        Array.isArray(notificationIds)
          ? notificationIds.map((id: unknown) => Number(id)).filter((id) => !Number.isNaN(id))
          : undefined,
      );
      return res.status(200).json({ ok: true });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to update notifications';
      return res.status(500).json({ error: message });
    }
  }

  res.setHeader('Allow', ['GET', 'PATCH']);
  return res.status(405).end('Method Not Allowed');
}
