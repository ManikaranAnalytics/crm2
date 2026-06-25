import type { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';
import { getSessionUser } from '../../../lib/auth/session';
import { extractEmlAttachmentByIndex, extractMsgAttachmentByDataId } from '../../../server/email/parseEmail';
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

  const { filename, dataId, attachmentIndex } = req.query;
  if (!filename) {
    return res.status(400).json({ error: 'Filename is required' });
  }

  const parsedDataId = dataId != null ? Number(dataId) : NaN;
  const parsedAttachmentIndex = attachmentIndex != null ? Number(attachmentIndex) : NaN;
  const hasDataId = Number.isFinite(parsedDataId);
  const hasAttachmentIndex = Number.isFinite(parsedAttachmentIndex);

  if (!hasDataId && !hasAttachmentIndex) {
    return res.status(400).json({ error: 'dataId or attachmentIndex is required' });
  }

  const { filePath, safeFilename } = resolveSecureFilePath(String(filename));
  const lowerName = safeFilename.toLowerCase();

  if (!isEmailFileName(safeFilename)) {
    return res.status(400).json({ error: 'Only nested email attachments can be extracted from .msg or .eml files' });
  }

  if (lowerName.endsWith('.msg') && !hasDataId) {
    return res.status(400).json({ error: 'dataId is required for .msg attachments' });
  }

  if (lowerName.endsWith('.eml') && !hasAttachmentIndex) {
    return res.status(400).json({ error: 'attachmentIndex is required for .eml attachments' });
  }

  try {
    const stats = await fs.promises.stat(filePath);
    if (!stats.isFile()) {
      return res.status(404).json({ error: 'Attachment not found' });
    }

    const extracted = lowerName.endsWith('.eml')
      ? await extractEmlAttachmentByIndex(filePath, parsedAttachmentIndex)
      : await extractMsgAttachmentByDataId(filePath, parsedDataId);
    if (!extracted) {
      return res.status(404).json({ error: 'Nested attachment not found' });
    }

    res.setHeader('Content-Type', extracted.contentType);
    res.setHeader('Content-Length', extracted.content.length);
    res.setHeader('Content-Disposition', `attachment; filename="${extracted.fileName}"`);
    return res.status(200).send(extracted.content);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to extract attachment';
    return res.status(500).json({ error: message });
  }
}
