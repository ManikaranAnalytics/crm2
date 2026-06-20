import type { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';
import { getSessionUser } from '../../../lib/auth/session';
import { CAN_MANAGE_QUERIES } from '../../../lib/auth/roles';
import { query } from '../../../lib/db';
import { listQueries, createQuery } from '../../../services/queryService';

export const config = {
  api: {
    bodyParser: { sizeLimit: '25mb' },
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const user = await getSessionUser(req);

  if (req.method === 'GET') {
	    const scope = Array.isArray(req.query.scope) ? req.query.scope[0] : req.query.scope;
	    const userIdParam = Array.isArray(req.query.userId) ? req.query.userId[0] : req.query.userId;
	    const idFromQuery = userIdParam ? Number(userIdParam) : NaN;

	    if (scope === 'my') {
	      const effectiveUserId = !Number.isNaN(idFromQuery) && idFromQuery > 0 ? idFromQuery : user?.id;
	      if (!effectiveUserId || Number.isNaN(effectiveUserId)) {
	        return res.status(401).json({ error: 'Not authenticated' });
	      }
	      const queries = await listQueries({ forUserId: effectiveUserId });
	      return res.status(200).json({ queries });
	    }

	    if (scope === 'all') {
	      const actorId = !Number.isNaN(idFromQuery) && idFromQuery > 0 ? idFromQuery : user?.id;
	      if (!actorId || Number.isNaN(actorId)) {
	        return res.status(401).json({ error: 'Not authenticated' });
	      }

	      const roleResult = await query<{ role_name: string }>(
	        `SELECT r.name AS role_name
	           FROM users u
	           JOIN roles r ON r.id = u.role_id
	          WHERE u.id = $1`,
	        [actorId],
	      );
	      const roleName = roleResult.rows[0]?.role_name;
	      if (!roleName) {
	        return res.status(403).json({ error: 'Not authorized' });
	      }

	      if (roleName === 'ADMIN') {
	        const queries = await listQueries();
	        return res.status(200).json({ queries });
	      }
	      if (roleName === 'KAM') {
	        const queries = await listQueries({ raisedById: actorId });
	        return res.status(200).json({ queries });
	      }

	      return res.status(403).json({ error: 'Only admin and KAM can view queries here' });
	    }

	    if (!user) {
	      return res.status(401).json({ error: 'Not authenticated' });
	    }

	    if (user.role === 'KAM') {
	      const queries = await listQueries({ raisedById: user.id });
	      return res.status(200).json({ queries });
	    }
	    if (user.role === 'ADMIN' || user.role === 'MANAGER') {
	      const queries = await listQueries();
	      return res.status(200).json({ queries });
	    }

	    return res.status(403).json({ error: 'Not authorized' });
  }

  if (req.method === 'POST') {
    if (!user || !CAN_MANAGE_QUERIES.includes(user.role)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    try {
	      const {
	        queryCode,
	        clientId,
	        clientName,
	        pssId,
	        pssText,
	        state,
	        capacityMw,
	        technology,
	        transmissionType,
	        issue,
	        periodOfIssue,
	        queryEntryDate,
	        queryAssignDate,
	        status,
	        attachment,
	      } = req.body || {};

		      // Require the original client email as a .msg attachment for every new query
		      if (!attachment || !attachment.dataBase64 || !attachment.fileName) {
		        return res
		          .status(400)
		          .json({ error: 'Client email (.msg) attachment is required to create a query' });
		      }
		      if (
		        typeof attachment.fileName !== 'string' ||
		        !attachment.fileName.toLowerCase().endsWith('.msg')
		      ) {
		        return res.status(400).json({ error: 'Attachment must be a .msg email file' });
		      }

	      const created = await createQuery({
	        queryCode,
	        clientId: clientId ? Number(clientId) : undefined,
	        clientName,
	        pssId: pssId ? Number(pssId) : undefined,
	        pssText,
	        state,
	        capacityMw,
	        technology,
	        transmissionType,
	        issue,
	        periodOfIssue,
	        queryEntryDate,
	        queryAssignDate,
	        status,
	        raisedByName: user.name,
	        raisedById: user.id,
	      });

		      // Persist the .msg attachment along with the query
		      const base64: string = attachment.dataBase64;
		      const buffer = Buffer.from(base64, 'base64');
		      const uploadsDir = path.join(
		        process.cwd(),
		        'uploads_secure',
		        `query_${created.id}`
		      );
		      await fs.promises.mkdir(uploadsDir, { recursive: true });
		      const safeName = String(attachment.fileName).replace(/[^a-zA-Z0-9._-]/g, '_');
		      const timestamp = Math.floor(Date.now() / 1000);
		      const uniqueName = `query_${created.id}_${timestamp}_${safeName}`;
		      const diskPath = path.join(uploadsDir, uniqueName);
		      await fs.promises.writeFile(diskPath, buffer);
		      const publicPath = `/api/attachments/query_${created.id}/${uniqueName}`;
		      const contentType =
		        typeof attachment.contentType === 'string' && attachment.contentType
		          ? attachment.contentType
		          : 'application/octet-stream';
		
		      await query(
		        `INSERT INTO attachments (owner_type, owner_id, file_name, file_path, content_type, uploaded_by)
		         VALUES ('QUERY', $1, $2, $3, $4, $5)`,
		        [created.id, attachment.fileName, publicPath, contentType, user.id],
		      );

	      return res.status(201).json({ query: created });
    } catch (err: any) {
      return res.status(400).json({ error: err.message || 'Failed to create query' });
    }
  }

  res.setHeader('Allow', ['GET', 'POST']);
  return res.status(405).end('Method Not Allowed');
}

