import type { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';
import { getSessionUser } from '../../../lib/auth/session';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end('Method Not Allowed');
  }

  // 1. Authenticate user
  const user = await getSessionUser(req);
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized: Please log in to access attachments' });
  }

  // 2. Extract and sanitize filename to prevent directory traversal
  const { filename } = req.query;
  const safeFilename = path.basename(String(filename));

  const privateDir = path.join(process.cwd(), 'uploads_secure');
  const filePath = path.join(privateDir, safeFilename);

  // 3. Verify file exists
  try {
    const stats = await fs.promises.stat(filePath);
    if (!stats.isFile()) {
      return res.status(404).json({ error: 'Attachment not found' });
    }

    // 4. Map MIME types
    let contentType = 'application/octet-stream';
    const ext = path.extname(safeFilename).toLowerCase();
    if (ext === '.pdf') {
      contentType = 'application/pdf';
    } else if (ext === '.png') {
      contentType = 'image/png';
    } else if (ext === '.jpg' || ext === '.jpeg') {
      contentType = 'image/jpeg';
    } else if (ext === '.docx') {
      contentType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    } else if (ext === '.xlsx') {
      contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    } else if (ext === '.msg') {
      contentType = 'application/vnd.ms-outlook';
    } else if (ext === '.eml') {
      contentType = 'message/rfc822';
    }

    // 5. Send file headers and stream contents
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Length', stats.size);
    res.setHeader('Content-Disposition', `inline; filename="${safeFilename}"`);

    const fileStream = fs.createReadStream(filePath);
    return fileStream.pipe(res);
  } catch (err) {
    return res.status(404).json({ error: 'Attachment not found' });
  }
}
