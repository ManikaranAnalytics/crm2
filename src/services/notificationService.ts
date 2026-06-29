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
    title: 'New ticket assigned',
    message: `Ticket ${queryCode} has been assigned to you. Status: Pending.`,
  });
}

export async function notifyTicketResolved(input: {
  queryId: number;
  queryCode: string;
  resolvedByName: string;
  resolvedAt: string;
  preview?: string;
  replyId?: number;
  recipientIds: number[];
}): Promise<void> {
  const trimmed = (input.preview ?? '').trim();
  const snippet = trimmed
    ? trimmed.length > 120
      ? `${trimmed.slice(0, 117)}...`
      : trimmed
    : '';
  const timestamp = new Date(input.resolvedAt).toLocaleString();
  const message = snippet
    ? `${input.resolvedByName} resolved this ticket at ${timestamp}. Status: Resolved. ${snippet}`
    : `${input.resolvedByName} resolved this ticket at ${timestamp}. Status: Resolved.`;
  const title = `${input.queryCode} resolved`;

  // Turn existing pending (assigned) notifications into resolved for this ticket.
  await query(
    `UPDATE notifications
        SET type = 'QUERY_REPLY',
            title = $1,
            message = $2,
            reply_id = $3,
            is_read = FALSE,
            created_at = now()
      WHERE query_id = $4 AND type = 'QUERY_ASSIGNED'`,
    [title, message, input.replyId ?? null, input.queryId],
  );

  const coveredResult = await query<{ user_id: number }>(
    `SELECT DISTINCT user_id
       FROM notifications
      WHERE query_id = $1 AND type = 'QUERY_REPLY'`,
    [input.queryId],
  );
  const coveredUserIds = new Set(coveredResult.rows.map((row) => row.user_id));

  const uniqueRecipientIds = Array.from(new Set(input.recipientIds.filter((id) => id > 0)));
  await Promise.all(
    uniqueRecipientIds
      .filter((userId) => !coveredUserIds.has(userId))
      .map((userId) =>
        createNotification({
          userId,
          queryId: input.queryId,
          replyId: input.replyId,
          type: 'QUERY_REPLY',
          title,
          message,
        }),
      ),
  );
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
  await notifyTicketResolved({
    queryId,
    queryCode,
    resolvedByName: authorName,
    resolvedAt,
    preview,
    replyId,
    recipientIds: [recipientId],
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
        LIMIT 10
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
