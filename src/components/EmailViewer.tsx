import React, { useMemo } from 'react';
import type { EmailAttachmentInfo, EmailRecipient, ParsedOutlookMsg } from '../lib/email/types';
import { formatBytes, formatRecipientsForHeader } from '../lib/email/emailUtils';

interface EmailViewerProps {
  email: ParsedOutlookMsg;
  sourceFileName?: string;
  actorId?: number;
}

const HeaderRow: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className="grid grid-cols-[72px_1fr] gap-x-3 gap-y-0.5 text-sm">
    <span className="font-semibold text-slate-500">{label}</span>
    <div className="min-w-0 text-slate-800">{children}</div>
  </div>
);

const EmailViewer: React.FC<EmailViewerProps> = ({
  email,
  sourceFileName,
  actorId,
}) => {
  const toRecipients: EmailRecipient[] = email.to || [];
  const ccRecipients: EmailRecipient[] = email.cc || [];
  const attachments: EmailAttachmentInfo[] = email.attachments || [];

  const nestedDownloadUrl = (attachment: EmailAttachmentInfo) => {
    if (!sourceFileName) return undefined;
    const params = new URLSearchParams({ filename: sourceFileName });
    if (attachment.dataId != null) {
      params.set('dataId', String(attachment.dataId));
    } else if (attachment.attachmentIndex != null) {
      params.set('attachmentIndex', String(attachment.attachmentIndex));
    } else {
      return undefined;
    }
    if (actorId) params.set('actorId', String(actorId));
    return `/api/attachments/extract-from-msg?${params.toString()}`;
  };

  const renderBody = useMemo(() => {
    if (email.htmlBody?.trim()) {
      return (
        <div
          className="email-html-body"
          dangerouslySetInnerHTML={{ __html: email.htmlBody }}
        />
      );
    }
    return (
      <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-slate-700">
        {email.textBody || email.body || '—'}
      </pre>
    );
  }, [email]);

  return (
    <div className="flex min-h-[600px] flex-1 flex-col bg-white">
      <div className="space-y-2 border-b border-slate-200 bg-slate-50/80 px-5 py-4">
        <HeaderRow label="From:">
          <span className="font-medium">{email.senderName || '—'}</span>
          {email.senderEmail ? (
            <span className="text-slate-500"> &lt;{email.senderEmail}&gt;</span>
          ) : null}
        </HeaderRow>
        <HeaderRow label="To:">{formatRecipientsForHeader(toRecipients)}</HeaderRow>
        {ccRecipients.length > 0 && (
          <HeaderRow label="CC:">{formatRecipientsForHeader(ccRecipients)}</HeaderRow>
        )}
        <HeaderRow label="Subject:">
          <span className="font-semibold text-slate-900">{email.subject || '—'}</span>
        </HeaderRow>
        {email.creationTime && (
          <HeaderRow label="Date:">
            {new Date(email.creationTime).toLocaleString()}
          </HeaderRow>
        )}
        {attachments.length > 0 && (
          <HeaderRow label="Attachments:">
            <div className="space-y-1.5">
              {attachments.map((attachment) => {
                const href = nestedDownloadUrl(attachment);
                return (
                  <div
                    key={`${attachment.fileName}-${attachment.dataId ?? attachment.attachmentIndex ?? attachment.size}`}
                    className="flex flex-wrap items-center gap-2 rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs"
                  >
                    <span className="font-medium text-slate-700">{attachment.fileName}</span>
                    <span className="text-slate-400">{formatBytes(attachment.size)}</span>
                    <span className="text-slate-400">{attachment.contentType}</span>
                    {href ? (
                      <a href={href} download className="font-medium text-indigo-600 hover:underline">
                        Download
                      </a>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </HeaderRow>
        )}
      </div>

      <div className="flex-1 overflow-y-auto bg-white px-6 py-5">
        <div className="mx-auto max-w-4xl rounded-md border border-slate-100 bg-white p-4 shadow-[inset_0_0_0_1px_rgba(15,23,42,0.02)]">
          {renderBody}
        </div>
      </div>
    </div>
  );
};

export default EmailViewer;
