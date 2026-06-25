export { EMAIL_FILE_EXTENSIONS, EMAIL_FILE_ACCEPT, isEmailFileName } from './emailFileValidation';

export function guessMimeType(fileName?: string, fallback = 'application/octet-stream'): string {  const ext = getFileExtension(fileName);
  const map: Record<string, string> = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.bmp': 'image/bmp',
    '.webp': 'image/webp',
    '.svg': 'image/svg+xml',
    '.pdf': 'application/pdf',
    '.doc': 'application/msword',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.xls': 'application/vnd.ms-excel',
    '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    '.txt': 'text/plain',
    '.html': 'text/html',
    '.htm': 'text/html',
    '.eml': 'message/rfc822',
    '.msg': 'application/vnd.ms-outlook',
  };
  return map[ext] || fallback;
}

export function formatBytes(bytes: number): string {
  if (!bytes || bytes < 1) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function normalizeContentId(contentId?: string): string | undefined {
  if (!contentId) return undefined;
  return contentId.replace(/^<|>$/g, '').trim();
}

export function replaceCidReferences(html: string, replacements: Array<{ cid: string; dataUrl: string }>): string {
  let result = html;
  for (const { cid, dataUrl } of replacements) {
    const normalized = normalizeContentId(cid);
    if (!normalized) continue;
    const pattern = new RegExp(`cid:${escapeRegExp(normalized)}`, 'gi');
    result = result.replace(pattern, dataUrl);
    // Outlook sometimes references without cid: prefix in src
    result = result.replace(
      new RegExp(`(src=["'])${escapeRegExp(normalized)}(["'])`, 'gi'),
      `$1${dataUrl}$2`,
    );
  }
  return result;
}

export function formatRecipientList(recipients: Array<{ name?: string; email: string }>): string {
  if (!recipients.length) return '—';
  return recipients
    .map((r) => (r.name && r.name !== r.email ? `${r.name} <${r.email}>` : r.email))
    .join('; ');
}

export function formatRecipientsForHeader(recipients: Array<{ name?: string; email: string }>): string {
  return formatRecipientList(recipients);
}

function getFileExtension(fileName?: string): string {
  if (!fileName) return '';
  const dot = fileName.lastIndexOf('.');
  return dot >= 0 ? fileName.slice(dot).toLowerCase() : '';
}
