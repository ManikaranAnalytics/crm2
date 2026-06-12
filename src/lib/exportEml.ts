export interface EmlAttachment {
  fileName: string;
  dataBase64: string;
  contentType?: string;
}

export interface ExportEmlOptions {
  to?: string;
  subject: string;
  body: string;
  attachments?: EmlAttachment[];
  downloadFileName?: string;
}

export function exportDraftEml({
  to = 'client@example.com',
  subject,
  body,
  attachments = [],
  downloadFileName = 'draft',
}: ExportEmlOptions): void {
  if (!body.trim()) {
    alert('Please enter a response body before exporting.');
    return;
  }

  const boundary = `----=_NextPart_${Math.random().toString(36).substring(2)}`;

  const headers = [
    `To: ${to}`,
    `Subject: ${subject}`,
    `X-Unsent: 1`,
    `MIME-Version: 1.0`,
    `Content-Type: multipart/mixed; boundary="${boundary}"`,
    '',
    `--${boundary}`,
    `Content-Type: text/html; charset=utf-8`,
    `Content-Transfer-Encoding: 7bit`,
    '',
    `<html><body>${body.replace(/\n/g, '<br>')}</body></html>`,
  ];

  const attachmentBlocks = attachments.map((att) =>
    [
      `--${boundary}`,
      `Content-Type: ${att.contentType || 'application/octet-stream'}; name="${att.fileName}"`,
      `Content-Transfer-Encoding: base64`,
      `Content-Disposition: attachment; filename="${att.fileName}"`,
      '',
      att.dataBase64,
    ].join('\r\n'),
  );

  const fullEml = [...headers, ...attachmentBlocks, `--${boundary}--`].join('\r\n');

  const blob = new Blob([fullEml], { type: 'message/rfc822' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${downloadFileName.replace(/[^a-z0-9]/gi, '_')}.eml`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export async function fetchAttachmentAsEmlPayload(
  url: string,
  fileName: string,
  actorId?: number,
): Promise<EmlAttachment | null> {
  try {
    const fetchUrl = actorId ? `${url}?actorId=${actorId}` : url;
    const res = await fetch(fetchUrl);
    if (!res.ok) return null;
    const blob = await res.blob();
    const buffer = await blob.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.length; i += 1) {
      binary += String.fromCharCode(bytes[i]);
    }
    return {
      fileName,
      dataBase64: btoa(binary),
      contentType: blob.type || 'application/octet-stream',
    };
  } catch {
    return null;
  }
}
