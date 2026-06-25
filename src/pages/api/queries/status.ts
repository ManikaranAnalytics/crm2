import type { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';
import { query } from '../../../lib/db';
import { isValidQueryStatus, updateQueryStatusWithApproval } from '../../../services/queryService';
import { isEmailFileName } from '../../../lib/email/emailFileValidation';

export const config = {
  api: {
    bodyParser: { sizeLimit: '25mb' },
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end('Method Not Allowed');
  }

	  const { id, status, requestedById, attachment, docAttachment, remark } = req.body || {};
  const queryId = Number(id);
  const requesterId = Number(requestedById);

  if (!queryId || Number.isNaN(queryId)) {
    return res.status(400).json({ error: 'Valid id is required' });
  }

  if (!requesterId || Number.isNaN(requesterId)) {
    return res.status(400).json({ error: 'Valid requestedById is required' });
  }

  if (!status || typeof status !== 'string' || !isValidQueryStatus(status)) {
    return res.status(400).json({ error: 'Valid status is required' });
  }

		  // When closing a query, require a solution .msg/.eml attachment; allow optional
		  // .docx solution document and free-text remark.
		  if (status === 'CLOSED') {
		    if (!attachment || !attachment.dataBase64 || !attachment.fileName) {
		      return res
		        .status(400)
		        .json({ error: 'Solution email (.msg or .eml) attachment is required to close a query' });
		    }
		    if (
		      typeof attachment.fileName !== 'string' ||
		      !isEmailFileName(attachment.fileName)
		    ) {
		      return res.status(400).json({ error: 'Attachment must be a .msg or .eml email file' });
		    }
		    if (docAttachment && docAttachment.fileName) {
		      if (
		        typeof docAttachment.fileName !== 'string' ||
		        !docAttachment.fileName.toLowerCase().endsWith('.docx')
		      ) {
		        return res
		          .status(400)
		          .json({ error: 'Solution document must be a .docx file if provided' });
		      }
		    }
		  }

		  try {
		    const updated = await updateQueryStatusWithApproval(queryId, status, requesterId, {
		      remark: typeof remark === 'string' ? remark : undefined,
		    });

		    // Persist the solution .msg alongside the query when closing
		    if (status === 'CLOSED' && attachment && attachment.dataBase64 && attachment.fileName) {
		      const base64: string = attachment.dataBase64;
		      const buffer = Buffer.from(base64, 'base64');
		      const uploadsDir = path.join(
		        process.cwd(),
		        'uploads_secure'
		      );
		      await fs.promises.mkdir(uploadsDir, { recursive: true });
		      const safeName = String(attachment.fileName).replace(/[^a-zA-Z0-9._-]/g, '_');
		      const timestamp = Math.floor(Date.now() / 1000);
		      const uniqueName = `query_${updated.id}_${timestamp}_${safeName}`;
		      const diskPath = path.join(uploadsDir, uniqueName);
		      await fs.promises.writeFile(diskPath, buffer);
		      const publicPath = `/api/attachments/${uniqueName}`;
		      const contentType =
		        typeof attachment.contentType === 'string' && attachment.contentType
		          ? attachment.contentType
		          : 'application/octet-stream';
		
		      await query(
		        `INSERT INTO attachments (owner_type, owner_id, file_name, file_path, content_type, uploaded_by)
		         VALUES ('QUERY', $1, $2, $3, $4, $5)`,
		        [updated.id, attachment.fileName, publicPath, contentType, requesterId],
		      );
		    }
		
		    // Persist the optional solution .docx alongside the query when closing
		    if (
		      status === 'CLOSED' &&
		      docAttachment &&
		      docAttachment.dataBase64 &&
		      docAttachment.fileName
		    ) {
		      const base64Doc: string = docAttachment.dataBase64;
		      const bufferDoc = Buffer.from(base64Doc, 'base64');
		      const uploadsDirDoc = path.join(
		        process.cwd(),
		        'uploads_secure'
		      );
		      await fs.promises.mkdir(uploadsDirDoc, { recursive: true });
		      const safeDocName = String(docAttachment.fileName).replace(/[^a-zA-Z0-9._-]/g, '_');
		      const timestampDoc = Math.floor(Date.now() / 1000);
		      const uniqueDocName = `query_${updated.id}_${timestampDoc}_${safeDocName}`;
		      const diskDocPath = path.join(uploadsDirDoc, uniqueDocName);
		      await fs.promises.writeFile(diskDocPath, bufferDoc);
		      const publicDocPath = `/api/attachments/${uniqueDocName}`;
		      const docContentType =
		        typeof docAttachment.contentType === 'string' && docAttachment.contentType
		          ? docAttachment.contentType
		          : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
		
		      await query(
		        `INSERT INTO attachments (owner_type, owner_id, file_name, file_path, content_type, uploaded_by)
		         VALUES ('QUERY', $1, $2, $3, $4, $5)`,
		        [updated.id, docAttachment.fileName, publicDocPath, docContentType, requesterId],
		      );
		    }
		
		    return res.status(200).json({ query: updated });
		  } catch (err: any) {
		    return res.status(400).json({ error: err.message || 'Failed to update query status' });
		  }
}

