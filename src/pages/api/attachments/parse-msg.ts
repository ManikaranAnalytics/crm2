import type { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';
import MsgReader from '@kenjiuno/msgreader';
import { getSessionUser } from '../../../lib/auth/session';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end('Method Not Allowed');
  }

  // 1. Authenticate user
  const user = await getSessionUser(req);
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized: Please log in' });
  }

  // 2. Extract and sanitize filename
  const { filename } = req.query;
  if (!filename) {
    return res.status(400).json({ error: 'Filename is required' });
  }

  const segments = String(filename).split(/[/\\]/).map(seg => path.basename(seg));
  const relativePath = path.join(...segments);
  const privateDir = path.join(process.cwd(), 'uploads_secure');
  const filePath = path.join(privateDir, relativePath);
  const safeFilename = segments[segments.length - 1] || '';

  // 3. Read and parse the .msg file
  try {
    const stats = await fs.promises.stat(filePath);
    if (!stats.isFile()) {
      return res.status(404).json({ error: 'Attachment not found' });
    }

    if (!safeFilename.toLowerCase().endsWith('.msg')) {
      return res.status(400).json({ error: 'Only .msg files can be parsed' });
    }

    const buffer = await fs.promises.readFile(filePath);
    const arrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
    const reader = new MsgReader(arrayBuffer);
    const data = reader.getFileData();

    return res.status(200).json({
      subject: data.subject || '',
      senderName: data.senderName || '',
      senderEmail: data.senderEmail || '',
      body: data.body || '',
      creationTime: data.creationTime || '',
      recipients: data.recipients || [],
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to parse .msg file' });
  }
}
