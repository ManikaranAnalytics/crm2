import { query } from '../lib/db';

export type NotificationType = 'QUERY_REPLY' | 'QUERY_ASSIGNED' | 'QUERY_CREATED';

export interface NotificationRecord {
  id: number;
  queryId?: number;
  replyId?: number;
  type: NotificationType;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

export async function createNotification(input: {
  userId: number;
  queryId?: number;
  replyId?: number;
  type: NotificationType;
  title: string;
  message: string;
}): Promise<void> {
  await query(
    `INSERT INTO notifications (user_id, query_id, reply_id, type, title, message)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [
      input.userId,
      input.queryId ?? null,
      input.replyId ?? null,
      input.type,
      input.title,
      input.message,
    ],
  );
}

export async function notifyQueryAssigned(
  assigneeId: number,
  queryId: number,
  queryCode: string,
): Promise<void> {
  await createNotification({
    userId: assigneeId,
    queryId,
    type: 'QUERY_ASSIGNED',
    title: 'New query assigned',
    message: `Query ${queryCode} has been automatically assigned to you.`,
  });
}

export async function notifyQueryReply(
  recipientId: number,
  queryId: number,
  replyId: number,
  authorName: string,
  queryCode: string,
  preview: string,
  resolvedAt: string,
): Promise<void> {
  const trimmed = preview.trim();
  const snippet = trimmed.length > 120 ? `${trimmed.slice(0, 117)}...` : trimmed;
  const timestamp = new Date(resolvedAt).toLocaleString();
  await createNotification({
    userId: recipientId,
    queryId,
    replyId,
    type: 'QUERY_REPLY',
    title: `${queryCode} resolved`,
    message: `${authorName} replied at ${timestamp}. Status: DONE. ${snippet}`,
  });
}

export async function listNotifications(userId: number): Promise<NotificationRecord[]> {
  const result = await query<{
    id: number;
    query_id: number | null;
    reply_id: number | null;
    type: NotificationType;
    title: string;
    message: string;
    is_read: boolean;
    created_at: string;
  }>(
    `WITH unread AS (
       SELECT id, query_id, reply_id, type, title, message, is_read, created_at
         FROM notifications
        WHERE user_id = $1 AND is_read = FALSE
     ),
     recent_read AS (
       SELECT id, query_id, reply_id, type, title, message, is_read, created_at
         FROM notifications
        WHERE user_id = $1 AND is_read = TRUE
        ORDER BY created_at DESC
        LIMIT 3
     )
     SELECT id, query_id, reply_id, type, title, message, is_read, created_at
       FROM (
         SELECT * FROM unread
         UNION ALL
         SELECT * FROM recent_read
       ) visible
      ORDER BY created_at DESC`,
    [userId],
  );

  return result.rows.map((row) => ({
    id: row.id,
    queryId: row.query_id ?? undefined,
    replyId: row.reply_id ?? undefined,
    type: row.type,
    title: row.title,
    message: row.message,
    isRead: row.is_read,
    createdAt: row.created_at,
  }));
}

export async function countUnreadNotifications(userId: number): Promise<number> {
  const result = await query<{ count: number }>(
    `SELECT COUNT(*)::int AS count
       FROM notifications
      WHERE user_id = $1 AND is_read = FALSE`,
    [userId],
  );
  return result.rows[0]?.count ?? 0;
}

export async function markNotificationsRead(
  userId: number,
  notificationIds?: number[],
): Promise<void> {
  if (notificationIds && notificationIds.length > 0) {
    await query(
      `UPDATE notifications
          SET is_read = TRUE
        WHERE user_id = $1 AND id = ANY($2::int[])`,
      [userId, notificationIds],
    );
    return;
  }

  await query(
    `UPDATE notifications SET is_read = TRUE WHERE user_id = $1 AND is_read = FALSE`,
    [userId],
  );
}
