import { parseEmlBuffer, parseMsgBuffer, toParsedOutlookMsg } from '../../../server/email/parseEmail';
import type { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';
import { getSessionUser } from '../../../lib/auth/session';
import { isEmailFileName } from '../../../lib/email/emailFileValidation';

function resolveSecureFilePath(filename: string): { filePath: string; safeFilename: string } {
  const segments = String(filename).split(/[/\\]/).map((seg) => path.basename(seg));
  const relativePath = path.join(...segments);
  const privateDir = path.join(process.cwd(), 'uploads_secure');
  const filePath = path.join(privateDir, relativePath);
  const safeFilename = segments[segments.length - 1] || '';
  return { filePath, safeFilename };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end('Method Not Allowed');
  }

  const user = await getSessionUser(req);
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized: Please log in' });
  }

  const { filename } = req.query;
  if (!filename) {
    return res.status(400).json({ error: 'Filename is required' });
  }

  const { filePath, safeFilename } = resolveSecureFilePath(String(filename));
  const lowerName = safeFilename.toLowerCase();

  try {
    const stats = await fs.promises.stat(filePath);
    if (!stats.isFile()) {
      return res.status(404).json({ error: 'Attachment not found' });
    }

    if (!isEmailFileName(safeFilename)) {
      return res.status(400).json({ error: 'Only .msg and .eml files can be parsed' });
    }

    const buffer = await fs.promises.readFile(filePath);
    const preview = lowerName.endsWith('.eml')
      ? await parseEmlBuffer(buffer)
      : await parseMsgBuffer(buffer);

    const response = toParsedOutlookMsg(preview);

    return res.status(200).json({
      ...response,
      recipients: preview.to,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to parse email file';
    return res.status(500).json({ error: message });
  }
}
