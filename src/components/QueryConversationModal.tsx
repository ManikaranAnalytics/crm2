import React, { useCallback, useEffect, useState } from 'react';
import { authHeaders } from '../pages/_app';
import { formatQueryStatus, isQueryResolved, statusBadgeClass } from '../lib/queryStatus';

const IconPaperclip = () => (
  <svg className="w-3.5 h-3.5 inline mr-1" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
    <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path>
  </svg>
);

const IconMail = () => (
  <svg className="w-4 h-4 inline ml-1.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
    <polyline points="22,6 12,13 2,6"></polyline>
  </svg>
);

const IconClose = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
    <line x1="18" y1="6" x2="6" y2="18"></line>
    <line x1="6" y1="6" x2="18" y2="18"></line>
  </svg>
);

export interface QueryThreadMessage {
  id: string;
  type: 'ORIGINAL' | 'REPLY';
  authorName: string;
  authorRole?: string;
  body: string;
  createdAt: string;
  attachment?: { fileName: string; url: string };
  attachments?: { fileName: string; url: string }[];
}

export interface QueryThread {
  queryId: number;
  queryCode: string;
  issue: string;
  raisedBy?: string;
  assignedTo?: string;
  status: string;
  closedDate?: string;
  originalAttachment?: { fileName: string; url: string };
  messages: QueryThreadMessage[];
  clientName?: string;
  state?: string;
  capacityMw?: number | null;
  technology?: string | null;
  transmissionType?: string | null;
  periodOfIssue?: string | null;
  queryRaisedDate?: string | null;
  pssText?: string | null;
}

interface AttachmentPayload {
  fileName: string;
  dataBase64: string;
  contentType: string;
}

interface QueryConversationModalProps {
  queryId: number | null;
  canReply: boolean;
  onClose: () => void;
  onReplySent?: () => void;
}

const QueryConversationModal: React.FC<QueryConversationModalProps> = ({
  queryId,
  canReply,
  onClose,
  onReplySent,
}) => {
  const [thread, setThread] = useState<QueryThread | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [replyBody, setReplyBody] = useState('');
  const [attachments, setAttachments] = useState<AttachmentPayload[]>([]);
  const [sending, setSending] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(true);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);

  const loadThread = useCallback(async () => {
    if (!queryId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/queries/replies?queryId=${queryId}`, {
        headers: authHeaders(),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || 'Failed to load conversation');
      }
      const data = await res.json();
      setThread(data.thread);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load conversation');
    } finally {
      setLoading(false);
    }
  }, [queryId]);

  useEffect(() => {
    if (!queryId) return;
    setSuccess(null);
    loadThread();
  }, [queryId, loadThread]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);

  const handleFilesChange = (files: FileList | null) => {
    if (!files) return;
    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = String(reader.result || '');
        const base64 = result.includes(',') ? result.split(',')[1] : result;
        setAttachments((prev) => [
          ...prev,
          {
            fileName: file.name,
            dataBase64: base64,
            contentType: file.type || 'application/octet-stream',
          },
        ]);
      };
      reader.readAsDataURL(file);
    });
  };

  const handleSend = async () => {
    if (!queryId || !replyBody.trim()) {
      setError('Reply text is required');
      return;
    }

    setSending(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch('/api/queries/replies', {
        method: 'POST',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          queryId,
          body: replyBody.trim(),
          attachments,
          attachment: attachments[0] || undefined,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || 'Failed to send reply');
      }
      const data = await res.json();
      setThread(data.thread);
      setReplyBody('');
      setAttachments([]);
      setSuccess(data.message || 'Query Resolved');
      onReplySent?.();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to send reply');
    } finally {
      setSending(false);
    }
  };

  const handleExportEml = () => {
    if (!replyBody.trim()) {
      alert('Please enter a response body before exporting.');
      return;
    }

    const to = 'client@example.com';
    const subject = `RE: ${thread?.queryCode || 'Query Response'}`;
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
      `<html><body>${replyBody.replace(/\n/g, '<br>')}</body></html>`,
    ];

    const attachmentBlocks = attachments.map(att => {
      return [
        `--${boundary}`,
        `Content-Type: ${att.contentType || 'application/octet-stream'}; name="${att.fileName}"`,
        `Content-Transfer-Encoding: base64`,
        `Content-Disposition: attachment; filename="${att.fileName}"`,
        '',
        att.dataBase64
      ].join('\r\n');
    });

    const fullEml = [
      ...headers,
      ...attachmentBlocks,
      `--${boundary}--`
    ].join('\r\n');

    const blob = new Blob([fullEml], { type: 'message/rfc822' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${(thread?.queryCode || 'draft').replace(/[^a-z0-9]/gi, '_')}.eml`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (!queryId) return null;

  const resolved = thread ? isQueryResolved(thread.status) : false;
  const showReplyForm = canReply && thread && !resolved;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
      <div className="flex h-[85vh] w-full max-w-3xl flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl">
        {/* Zone 1 — Header */}
        <div className="flex-shrink-0 bg-teal-700 px-6 py-4 text-white">
          <div className="flex items-center justify-between gap-3">
            <p className="text-base font-semibold">
              Reply to: {thread ? `${thread.queryCode} — ${thread.clientName ?? '—'}` : 'Loading… — Loading…'}
            </p>
            <button
              type="button"
              onClick={onClose}
              className="text-lg text-white/70 hover:text-white flex items-center justify-center"
              aria-label="Close"
            >
              <IconClose />
            </button>
          </div>
          <div className="mt-2 flex items-center justify-between gap-3">
            <p className="text-sm text-teal-100">
              From: {thread?.raisedBy ?? 'KAM'}
            </p>
            {thread && (
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${statusBadgeClass(thread.status)}`}
              >
                {resolved ? 'Resolved' : formatQueryStatus(thread.status)}
              </span>
            )}
          </div>
        </div>

        {/* Zone 2 — Thread */}
        <div className="flex-1 space-y-3 overflow-y-auto bg-slate-50 px-6 py-4">
          {success && (
            <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
              {success}
            </p>
          )}
          {error && (
            <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}

          {thread && (
            <div className="mb-4 rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-sm">
              <button
                type="button"
                onClick={() => setDetailsOpen((o) => !o)}
                className="flex w-full items-center justify-between text-xs font-semibold uppercase tracking-wide text-slate-500"
              >
                Query Details
                <span className="text-slate-400">{detailsOpen ? '▲' : '▼'}</span>
              </button>
              {detailsOpen && (
                <div
                  className="mt-2"
                  style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px 24px' }}
                >
                  <div>
                    <div className="text-xs text-slate-400">Client</div>
                    <div className="text-sm font-medium text-slate-700">{thread.clientName ?? '—'}</div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-400">PSS</div>
                    <div className="text-sm font-medium text-slate-700">{thread.pssText ?? '—'}</div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-400">Capacity</div>
                    <div className="text-sm font-medium text-slate-700">
                      {thread.capacityMw != null && thread.capacityMw !== 0
                        ? `${thread.capacityMw} MW`
                        : '—'}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-400">State</div>
                    <div className="text-sm font-medium text-slate-700">{thread.state ?? '—'}</div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-400">Technology</div>
                    <div className="text-sm font-medium text-slate-700">{thread.technology ?? '—'}</div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-400">Transmission</div>
                    <div className="text-sm font-medium text-slate-700">
                      {thread.transmissionType ?? '—'}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-400">Period of Issue</div>
                    <div className="text-sm font-medium text-slate-700">
                      {thread.periodOfIssue ?? '—'}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-400">Raised by</div>
                    <div className="text-sm font-medium text-slate-700">{thread.raisedBy ?? '—'}</div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-400">Assigned to</div>
                    <div className="text-sm font-medium text-slate-700">{thread.assignedTo ?? '—'}</div>
                  </div>
                </div>
              )}
            </div>
          )}

          {loading && <p className="text-sm text-slate-500">Loading conversation...</p>}

          <div className="divide-y divide-slate-200">
            {thread?.messages.map((message) => (
              <div key={message.id} className="py-3 first:pt-0 last:pb-0">
                <div
                  className={`rounded-lg border px-5 py-4 shadow-sm ${
                    message.type === 'ORIGINAL'
                      ? 'border-slate-200 bg-white'
                      : 'border-teal-100 bg-teal-50'
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2">
                      {message.type === 'ORIGINAL' ? (
                        <>
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-500">
                            Original Query
                          </span>
                          <p className="text-sm font-semibold text-slate-800">
                            From: {message.authorName}
                          </p>
                        </>
                      ) : (
                        <>
                          <span className="rounded-full bg-teal-100 px-2 py-0.5 text-[10px] text-teal-700">
                            Reply
                          </span>
                          <p className="text-sm font-semibold text-teal-800">
                            {message.authorName}
                            {message.authorRole ? (
                              <span className="ml-1 font-normal text-teal-600">
                                ({message.authorRole})
                              </span>
                            ) : null}
                          </p>
                        </>
                      )}
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      {message.createdAt ? (
                        <span className="text-xs text-slate-400">
                          {new Date(message.createdAt).toLocaleString()}
                        </span>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(message.body);
                          setCopiedMessageId(message.id);
                          setTimeout(() => setCopiedMessageId(null), 2000);
                        }}
                        className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-0.5 text-[11px] font-medium text-slate-500 shadow-sm transition-colors hover:border-teal-400 hover:text-teal-600"
                      >
                        <svg
                          width="12"
                          height="12"
                          viewBox="0 0 12 12"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                          aria-hidden="true"
                        >
                          <rect
                            x="4"
                            y="4"
                            width="7"
                            height="7"
                            rx="1"
                            stroke="currentColor"
                            strokeWidth="1"
                          />
                          <rect
                            x="1"
                            y="1"
                            width="7"
                            height="7"
                            rx="1"
                            stroke="currentColor"
                            strokeWidth="1"
                            fill="white"
                          />
                        </svg>
                        {copiedMessageId === message.id ? 'Copied!' : 'Copy'}
                      </button>
                    </div>
                  </div>
                  <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">{message.body}</p>
                  {message.attachments?.map((att, idx) => (
                    <a
                      key={`multi-${idx}`}
                      href={att.url}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-2 inline-flex items-center text-xs text-indigo-600 hover:underline"
                    >
                      <IconPaperclip /> {att.fileName}
                    </a>
                  ))}
                  {message.attachment && (
                    <a
                      href={message.attachment.url}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-2 inline-flex items-center text-xs text-indigo-600 hover:underline"
                    >
                      <IconPaperclip /> {message.attachment.fileName}
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>

          {resolved && (
            <p className="text-center text-xs text-slate-500">
              This query is resolved. The conversation is read-only.
            </p>
          )}
        </div>

        {/* Zone 3 — Compose */}
        {showReplyForm && (
          <div className="flex-shrink-0 border-t border-slate-200 bg-white">
            <div className="px-6 pb-2 pt-4">
              <textarea
                value={replyBody}
                onChange={(e) => setReplyBody(e.target.value)}
                className="min-h-[140px] w-full resize-y rounded-lg border border-slate-200 px-4 py-3 text-sm text-slate-800 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                placeholder="Write your response to the Key Access Manager..."
              />
            </div>

            <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 bg-slate-50 px-6 py-2">
              <span className="text-xs font-medium text-slate-500 flex items-center gap-1">
                <IconPaperclip /> Attachments
              </span>
              {attachments.map((att, idx) => (
                <button
                  key={`${att.fileName}-${idx}`}
                  type="button"
                  onClick={() => setAttachments((prev) => prev.filter((_, i) => i !== idx))}
                  className="inline-flex items-center gap-1 rounded-full border border-teal-200 bg-teal-50 px-3 py-1 text-xs text-teal-700"
                >
                  <IconPaperclip /> {att.fileName} ✕
                </button>
              ))}
              <label className="inline-flex cursor-pointer items-center gap-1 rounded-full border border-dashed border-teal-400 px-3 py-1 text-xs text-teal-600 hover:bg-teal-50">
                + Add File
                <input
                  type="file"
                  multiple
                  className="hidden"
                  onChange={(e) => handleFilesChange(e.target.files)}
                />
              </label>
            </div>

            <div className="flex items-center justify-between border-t border-slate-200 px-6 py-3">
              <div />
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleExportEml}
                  className="rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-2 text-sm font-semibold text-indigo-700 hover:bg-indigo-100 flex items-center justify-center gap-1.5"
                >
                  Export Draft (.eml)
                </button>
                <button
                  type="button"
                  disabled={sending}
                  onClick={handleSend}
                  className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-5 py-2 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-60"
                >
                  {sending ? 'Sending…' : (
                    <>
                      Send Reply <IconMail />
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default QueryConversationModal;
