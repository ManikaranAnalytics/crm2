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

  // 2. Extract paths array from catch-all route [...filename]
  const { filename } = req.query;
  const pathSegments = Array.isArray(filename) ? filename : [filename];
  
  // Sanitize path segments to prevent directory traversal
  const safeSegments = pathSegments.map(seg => path.basename(String(seg)));
  const relativePath = path.join(...safeSegments);

  const privateDir = path.join(process.cwd(), 'uploads_secure');
  const filePath = path.join(privateDir, relativePath);

  // 3. Verify file exists
  try {
    const stats = await fs.promises.stat(filePath);
    if (!stats.isFile()) {
      return res.status(404).json({ error: 'Attachment not found' });
    }

    const lastSegment = safeSegments[safeSegments.length - 1] || '';

    // 4. Map MIME types
    let contentType = 'application/octet-stream';
    const ext = path.extname(lastSegment).toLowerCase();
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
    }

    // 5. Send file headers and stream contents
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Length', stats.size);
    res.setHeader('Content-Disposition', `inline; filename="${lastSegment}"`);

    const fileStream = fs.createReadStream(filePath);
    return fileStream.pipe(res);
  } catch (err) {
    return res.status(404).json({ error: 'Attachment not found' });
  }
}
