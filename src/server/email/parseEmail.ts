import MsgReader from '@kenjiuno/msgreader';
import type { FieldsData } from '@kenjiuno/msgreader';
import fs from 'fs';
import { simpleParser } from 'mailparser';
import {
  guessMimeType,
  normalizeContentId,
  replaceCidReferences,
} from '../../lib/email/emailUtils';
import type {
  EmailAttachmentInfo,
  EmailRecipient,
  ParsedEmailPreview,
  ParsedOutlookMsg,
} from '../../lib/email/types';
import { plainTextToHtml, sanitizeEmailHtml } from './sanitizeEmailHtml';
import { msgCompressedRtfToHtml, decodeMsgHtmlBytes } from './rtfToHtml';

function extractMsgHtmlSource(data: ReturnType<MsgReader['getFileData']>): string | undefined {
  if (data.bodyHtml?.trim()) return data.bodyHtml;
  if (data.html?.length) {
    const codepage =
      typeof data.internetCodepage === 'number'
        ? data.internetCodepage
        : typeof data.messageCodepage === 'number'
          ? data.messageCodepage
          : undefined;
    const decoded = decodeMsgHtmlBytes(data.html, codepage).trim();
    return decoded || undefined;
  }
  return undefined;
}

async function buildMsgHtmlBody(
  reader: MsgReader,
  data: ReturnType<MsgReader['getFileData']>,
  textBody: string,
): Promise<{ htmlBody?: string; bodyFormat: 'html' | 'text' }> {
  const replacements = buildMsgInlineReplacements(reader, data.attachments);
  const rawHtml = extractMsgHtmlSource(data);

  if (rawHtml) {
    const withImages = replaceCidReferences(rawHtml, replacements);
    return {
      htmlBody: sanitizeEmailHtml(withImages),
      bodyFormat: 'html',
    };
  }

  if (data.compressedRtf?.length) {
    const rtfHtml = await msgCompressedRtfToHtml(data.compressedRtf);
    if (rtfHtml?.trim()) {
      const withImages = replaceCidReferences(rtfHtml, replacements);
      return {
        htmlBody: sanitizeEmailHtml(withImages),
        bodyFormat: 'html',
      };
    }
  }

  if (textBody) {
    return {
      htmlBody: sanitizeEmailHtml(plainTextToHtml(textBody)),
      bodyFormat: 'text',
    };
  }

  return { bodyFormat: 'text' };
}

export function toParsedOutlookMsg(preview: ParsedEmailPreview): ParsedOutlookMsg {
  return {
    subject: preview.subject,
    senderName: preview.senderName,
    senderEmail: preview.senderEmail,
    body: preview.textBody,
    creationTime: preview.creationTime,
    to: preview.to,
    cc: preview.cc,
    bodyFormat: preview.bodyFormat,
    htmlBody: preview.htmlBody,
    textBody: preview.textBody,
    attachments: preview.attachments,
  };
}

function mapMsgRecipients(recipients: FieldsData[] | undefined): EmailRecipient[] {
  if (!recipients?.length) return [];
  return recipients.flatMap((recipient) => {
    const email = recipient.email || recipient.smtpAddress || recipient.name || '';
    if (!email) return [];
    return [{
      name: recipient.name && recipient.name !== email ? recipient.name : undefined,
      email,
    }];
  });
}

function splitMsgRecipients(recipients: FieldsData[] | undefined): { to: EmailRecipient[]; cc: EmailRecipient[] } {
  const to: EmailRecipient[] = [];
  const cc: EmailRecipient[] = [];
  for (const recipient of recipients || []) {
    const mapped = mapMsgRecipients([recipient])[0];
    if (!mapped) continue;
    const type = String(recipient.recipType || '').toLowerCase();
    if (type === 'cc') cc.push(mapped);
    else to.push(mapped);
  }
  return { to, cc };
}

function buildMsgInlineReplacements(
  reader: MsgReader,
  attachments: FieldsData[] | undefined,
): Array<{ cid: string; dataUrl: string }> {
  const replacements: Array<{ cid: string; dataUrl: string }> = [];
  for (const att of attachments || []) {
    try {
      const extracted = reader.getAttachment(att);
      if (!extracted?.content?.length) continue;
      const mime = guessMimeType(extracted.fileName || att.fileName || att.fileNameShort, 'application/octet-stream');
      const base64 = Buffer.from(extracted.content).toString('base64');
      const dataUrl = `data:${mime};base64,${base64}`;
      const candidates = [
        normalizeContentId(att.pidContentId),
        att.fileName,
        att.fileNameShort,
        extracted.fileName,
      ].filter((v): v is string => !!v);
      for (const cid of candidates) {
        replacements.push({ cid, dataUrl });
      }
    } catch {
      // Skip unreadable attachment entries.
    }
  }
  return replacements;
}

function buildMsgAttachmentList(
  attachments: FieldsData[] | undefined,
  reader: MsgReader,
): EmailAttachmentInfo[] {
  const list: EmailAttachmentInfo[] = [];
  for (const att of attachments || []) {
    try {
      const extracted = reader.getAttachment(att);
      const fileName = extracted.fileName || att.fileName || att.fileNameShort || 'attachment';
      const isInline = !!att.attachmentHidden || !!att.pidContentId;
      list.push({
        fileName,
        contentType: guessMimeType(fileName),
        size: extracted.content?.length || att.contentLength || 0,
        isInline,
        dataId: typeof att.dataId === 'number' ? att.dataId : undefined,
        contentId: normalizeContentId(att.pidContentId),
      });
    } catch {
      // Skip unreadable attachment entries.
    }
  }
  return list.filter((a) => !a.isInline);
}

export async function extractMsgAttachmentByDataId(
  filePath: string,
  dataId: number,
): Promise<{ fileName: string; content: Buffer; contentType: string } | null> {
  const buffer = await fs.promises.readFile(filePath);
  const arrayBuffer = buffer.buffer.slice(
    buffer.byteOffset,
    buffer.byteOffset + buffer.byteLength,
  ) as ArrayBuffer;
  const reader = new MsgReader(arrayBuffer);
  const data = reader.getFileData();
  const attachmentMeta = data.attachments?.find((att) => att.dataId === dataId);
  if (!attachmentMeta) return null;
  const extracted = reader.getAttachment(attachmentMeta);
  if (!extracted?.content?.length) return null;
  const fileName = extracted.fileName || attachmentMeta.fileName || 'attachment';
  return {
    fileName,
    content: Buffer.from(extracted.content),
    contentType: guessMimeType(fileName),
  };
}

export async function extractEmlAttachmentByIndex(
  filePath: string,
  attachmentIndex: number,
): Promise<{ fileName: string; content: Buffer; contentType: string } | null> {
  const buffer = await fs.promises.readFile(filePath);
  const parsed = await simpleParser(buffer);
  let index = 0;
  for (const att of parsed.attachments || []) {
    if (isEmlDownloadableAttachment(att)) {
      if (index === attachmentIndex && att.content) {
        const fileName = att.filename || 'attachment';
        return {
          fileName,
          content: att.content,
          contentType: att.contentType || guessMimeType(fileName),
        };
      }
      index += 1;
    }
  }
  return null;
}

function isEmlDownloadableAttachment(att: {
  related?: boolean;
  cid?: string;
  contentDisposition?: string;
}): boolean {
  if (att.related) return false;
  if (att.contentDisposition === 'inline') return false;
  if (att.cid && att.contentDisposition !== 'attachment') return false;
  return true;
}

export async function parseMsgBuffer(buffer: Buffer): Promise<ParsedEmailPreview> {
  const arrayBuffer = buffer.buffer.slice(
    buffer.byteOffset,
    buffer.byteOffset + buffer.byteLength,
  ) as ArrayBuffer;
  const reader = new MsgReader(arrayBuffer);
  const data = reader.getFileData();
  const { to, cc } = splitMsgRecipients(data.recipients);
  const textBody = (data.body || '').trim();
  const { htmlBody, bodyFormat } = await buildMsgHtmlBody(reader, data, textBody);

  return {
    subject: data.subject || '',
    senderName: data.senderName || '',
    senderEmail: data.senderEmail || '',
    to,
    cc,
    creationTime: data.creationTime || data.clientSubmitTime || '',
    bodyFormat,
    htmlBody,
    textBody,
    attachments: buildMsgAttachmentList(data.attachments, reader),
  };
}

function mapAddressField(
  field: Awaited<ReturnType<typeof simpleParser>>['to'],
): EmailRecipient[] {
  if (!field) return [];
  const groups = Array.isArray(field) ? field : [field];
  return groups
    .flatMap((group) => group.value)
    .map((entry) => ({
      name: entry.name || undefined,
      email: entry.address || '',
    }))
    .filter((entry) => !!entry.email);
}

function mapAddressFieldCc(
  field: Awaited<ReturnType<typeof simpleParser>>['cc'],
): EmailRecipient[] {
  if (!field) return [];
  const groups = Array.isArray(field) ? field : [field];
  return groups
    .flatMap((group) => group.value)
    .map((entry) => ({
      name: entry.name || undefined,
      email: entry.address || '',
    }))
    .filter((entry) => !!entry.email);
}

export async function parseEmlBuffer(buffer: Buffer): Promise<ParsedEmailPreview> {
  const parsed = await simpleParser(buffer);
  const textBody = (parsed.text || '').trim();
  let rawHtml = parsed.html || parsed.textAsHtml || '';
  let bodyFormat: 'html' | 'text' = rawHtml ? 'html' : 'text';

  const replacements: Array<{ cid: string; dataUrl: string }> = [];
  const fileAttachments: EmailAttachmentInfo[] = [];
  let attachmentIndex = 0;

  for (const att of parsed.attachments || []) {
    const fileName = att.filename || 'attachment';
    const contentType = att.contentType || guessMimeType(fileName);
    const size = att.size || att.content?.length || 0;
    const cid = normalizeContentId(att.cid);
    if (cid && att.content) {
      const base64 = att.content.toString('base64');
      replacements.push({ cid, dataUrl: `data:${contentType};base64,${base64}` });
    }
    if (isEmlDownloadableAttachment(att)) {
      fileAttachments.push({
        fileName,
        contentType,
        size,
        isInline: false,
        attachmentIndex,
      });
      attachmentIndex += 1;
    }
  }

  let htmlBody: string | undefined;
  if (rawHtml) {
    const bodyMatch = rawHtml.match(/<body[^>]*>([\s\S]*)<\/body>/i);
    const htmlContent = bodyMatch ? bodyMatch[1] : rawHtml;
    htmlBody = sanitizeEmailHtml(replaceCidReferences(htmlContent, replacements));
  } else if (textBody) {
    htmlBody = sanitizeEmailHtml(plainTextToHtml(textBody));
    bodyFormat = 'text';
  }

  const from = parsed.from?.value?.[0];

  return {
    subject: parsed.subject || '',
    senderName: from?.name || '',
    senderEmail: from?.address || '',
    to: mapAddressField(parsed.to),
    cc: mapAddressFieldCc(parsed.cc),
    creationTime: parsed.date?.toISOString() || '',
    bodyFormat,
    htmlBody,
    textBody,
    attachments: fileAttachments,
  };
}
