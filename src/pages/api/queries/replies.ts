import type { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';
import { getSessionUser } from '../../../lib/auth/session';
import { query } from '../../../lib/db';
import {
  canUserAccessQueryThread,
  createQueryReply,
  getQueryThread,
} from '../../../services/queryService';

export const config = {
  api: {
    bodyParser: { sizeLimit: '25mb' },
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const user = await getSessionUser(req);
  if (!user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  if (req.method === 'GET') {
    const queryIdRaw = Array.isArray(req.query.queryId)
      ? req.query.queryId[0]
      : req.query.queryId;
    const queryId = Number(queryIdRaw);
    if (!queryId || Number.isNaN(queryId)) {
      return res.status(400).json({ error: 'queryId is required' });
    }

    try {
      const allowed = await canUserAccessQueryThread(queryId, user.id, user.role);
      if (!allowed) {
        return res.status(403).json({ error: 'You are not authorized to view this ticket thread' });
      }

      const thread = await getQueryThread(queryId);
      if (!thread) return res.status(404).json({ error: 'Ticket not found' });
      return res.status(200).json({ thread });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load thread';
      return res.status(500).json({ error: message });
    }
  }

  if (req.method === 'POST') {
    if (!['ADMIN', 'MANAGER'].includes(user.role)) {
      return res.status(403).json({ error: 'You are not authorized to reply to tickets' });
    }

    const { queryId, body, attachment, attachments } = req.body || {};
    const qId = Number(queryId);
    if (!qId || Number.isNaN(qId)) {
      return res.status(400).json({ error: 'queryId is required' });
    }

    try {
      let attachmentId: number | undefined;
      let attachmentIds: number[] | undefined;

      const saveAttachment = async (item: {
        fileName: string;
        dataBase64: string;
        contentType?: string;
      }): Promise<number | undefined> => {
        const buffer = Buffer.from(String(item.dataBase64), 'base64');
        const uploadsDir = path.join(
          process.cwd(),
          'uploads_secure',
          `query_${qId}`
        );
        await fs.promises.mkdir(uploadsDir, { recursive: true });
        const safeName = String(item.fileName).replace(/[^a-zA-Z0-9._-]/g, '_');
        const timestamp = Math.floor(Date.now() / 1000);
        const uniqueName = `reply_${qId}_${timestamp}_${safeName}`;
        const diskPath = path.join(uploadsDir, uniqueName);
        await fs.promises.writeFile(diskPath, buffer);
        const publicPath = `/api/attachments/query_${qId}/${uniqueName}`;
        const contentType =
          typeof item.contentType === 'string' && item.contentType
            ? item.contentType
            : 'application/octet-stream';
 
        const attachmentResult = await query<{ id: number }>(
          `INSERT INTO attachments (owner_type, owner_id, file_name, file_path, content_type, uploaded_by)
           VALUES ('QUERY', $1, $2, $3, $4, $5)
           RETURNING id`,
          [qId, item.fileName, publicPath, contentType, user.id],
        );
        return attachmentResult.rows[0]?.id;
      };

      if (Array.isArray(attachments) && attachments.length > 0) {
        const ids: number[] = [];
        for (const item of attachments) {
          if (item?.dataBase64 && item?.fileName) {
            const id = await saveAttachment(item);
            if (id) ids.push(id);
          }
        }
        if (ids.length) attachmentIds = ids;
      } else if (attachment?.dataBase64 && attachment?.fileName) {
        attachmentId = await saveAttachment(attachment);
      }

      const result = await createQueryReply({
        queryId: qId,
        authorId: user.id,
        body: String(body ?? ''),
        attachmentId,
        attachmentIds,
      });

      const thread = await getQueryThread(qId);
      return res.status(201).json({
        replyId: result.replyId,
        status: result.status,
        closedDate: result.closedDate,
        message: 'Ticket Resolved',
        thread,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to send reply';
      const status =
        message.includes('not authorized') || message.includes('already resolved') ? 403 : 400;
      return res.status(status).json({ error: message });
    }
  }

  res.setHeader('Allow', ['GET', 'POST']);
  return res.status(405).end('Method Not Allowed');
}
