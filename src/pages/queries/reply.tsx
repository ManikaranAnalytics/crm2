import React, { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Layout from '../../components/Layout';
import { authHeaders, useAuth } from '../_app';
import { formatQueryStatus, isQueryResolved, statusBadgeClass } from '../../lib/queryStatus';

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

const IconDownload = () => (
  <svg className="w-3.5 h-3.5 inline mr-1" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
    <polyline points="7 10 12 15 17 10"></polyline>
    <line x1="12" y1="15" x2="12" y2="3"></line>
  </svg>
);

interface AttachmentItem {
  fileName: string;
  url: string;
}

interface ParsedMsg {
  subject: string;
  senderName: string;
  senderEmail: string;
  body: string;
  creationTime: string;
  recipients: { name?: string; email?: string; type?: string }[];
}

interface ThreadMessage {
  id: string;
  type: 'ORIGINAL' | 'REPLY';
  authorName: string;
  authorRole?: string;
  body: string;
  createdAt: string;
  attachments?: AttachmentItem[];
  attachment?: AttachmentItem;
}

interface QueryThread {
  queryId: number;
  queryCode: string;
  issue: string;
  raisedBy?: string;
  assignedTo?: string;
  status: string;
  clientName?: string;
  state?: string;
  capacityMw?: number | null;
  technology?: string | null;
  transmissionType?: string | null;
  periodOfIssue?: string | null;
  queryRaisedDate?: string | null;
  pssText?: string | null;
  messages: ThreadMessage[];
}

interface AttachmentPayload {
  fileName: string;
  dataBase64: string;
  contentType: string;
}

const ReplyPage: React.FC = () => {
  const { user } = useAuth();
  const router = useRouter();
  const { id } = router.query;

  const [thread, setThread] = useState<QueryThread | null>(null);
  const [parsedMsg, setParsedMsg] = useState<ParsedMsg | null>(null);
  const [loading, setLoading] = useState(true);
  const [parsingMsg, setParsingMsg] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [replyBody, setReplyBody] = useState('');
  const [attachments, setAttachments] = useState<AttachmentPayload[]>([]);
  const [sending, setSending] = useState(false);

  const loadThread = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/queries/replies?queryId=${id}`, {
        headers: authHeaders(),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || 'Failed to load conversation');
      }
      const data = await res.json();
      setThread(data.thread);

      // Try to parse the original msg attachment
      const originalMsg = data.thread?.messages.find((m: ThreadMessage) => m.type === 'ORIGINAL');
      const attachment = originalMsg?.attachments?.[0] || originalMsg?.attachment;
      if (attachment && attachment.url.toLowerCase().endsWith('.msg')) {
        const filename = attachment.url.replace('/api/attachments/', '');
        loadParsedMsg(filename);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load conversation');
    } finally {
      setLoading(false);
    }
  }, [id]);

  const loadParsedMsg = async (filename: string) => {
    setParsingMsg(true);
    try {
      const res = await fetch(`/api/attachments/parse-msg?filename=${encodeURIComponent(filename)}&actorId=${user?.id}`, {
        headers: authHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        setParsedMsg(data);
      }
    } catch {
      // ignore parsing failure, fallback to raw details
    } finally {
      setParsingMsg(false);
    }
  };

  useEffect(() => {
    if (id && user) {
      loadThread();
    }
  }, [id, user, loadThread]);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (replyBody.trim() !== '') {
        const msg = 'You have unsaved changes. Are you sure you want to leave?';
        e.returnValue = msg;
        return msg;
      }
    };

    const handleRouteChangeStart = (url: string) => {
      if (replyBody.trim() !== '') {
        const confirmLeave = window.confirm('You have unsaved changes. Are you sure you want to leave?');
        if (!confirmLeave) {
          router.events.emit('routeChangeError');
          throw 'routeChange aborted';
        }
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    router.events.on('routeChangeStart', handleRouteChangeStart);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      router.events.off('routeChangeStart', handleRouteChangeStart);
    };
  }, [replyBody, router]);

  const handleFilesChange = (files: FileList | null) => {
    if (!files) return;
    setError(null);
    Array.from(files).forEach((file) => {
      if (file.size > 20 * 1024 * 1024) {
        setError(`File "${file.name}" exceeds the 20MB limit.`);
        return;
      }
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
    if (!id || !replyBody.trim()) {
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
          queryId: Number(id),
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
      setSuccess('Reply sent successfully!');
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

    const to = parsedMsg?.senderEmail || 'client@example.com';
    const subject = `RE: ${parsedMsg?.subject || thread?.queryCode || 'Query Response'}`;
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

  if (!user) {
    return (
      <Layout>
        <div className="p-6 text-center">
          <p className="text-slate-500">Please sign in to reply to queries.</p>
        </div>
      </Layout>
    );
  }

  if (loading) {
    return (
      <Layout>
        <div className="p-6 text-center text-slate-500">Loading query details...</div>
      </Layout>
    );
  }

  if (!thread) {
    return (
      <Layout>
        <div className="p-6 text-center text-red-500">
          {error || 'Query not found.'}
        </div>
      </Layout>
    );
  }

  const resolved = isQueryResolved(thread.status);
  const originalMsg = thread.messages.find((m) => m.type === 'ORIGINAL');
  const replies = thread.messages.filter((m) => m.type === 'REPLY');

  return (
    <Layout>
      {/* Query Metadata Overview Banner */}
      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm mb-6 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div>
          <span className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400">Query Code</span>
          <span className="text-sm font-mono font-bold text-teal-700">{thread.queryCode}</span>
        </div>
        <div>
          <span className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400">Client</span>
          <span className="text-sm font-semibold text-slate-800">{thread.clientName || '—'}</span>
        </div>
        <div>
          <span className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400">Raised By</span>
          <span className="text-sm font-semibold text-slate-800">{thread.raisedBy || '—'}</span>
        </div>
        <div>
          <span className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400">Assigned To</span>
          <span className="text-sm font-semibold text-slate-800">{thread.assignedTo || '—'}</span>
        </div>
        <div>
          <span className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400">Email (.msg)</span>
          {originalMsg?.attachments?.[0] ? (
            <a
              href={user ? `${originalMsg.attachments[0].url}?actorId=${user.id}` : originalMsg.attachments[0].url}
              className="text-xs text-indigo-600 hover:underline font-medium block truncate"
              title={originalMsg.attachments[0].fileName}
              target="_blank"
              rel="noreferrer"
            >
              <IconPaperclip /> {originalMsg.attachments[0].fileName}
            </a>
          ) : originalMsg?.attachment ? (
            <a
              href={user ? `${originalMsg.attachment.url}?actorId=${user.id}` : originalMsg.attachment.url}
              className="text-xs text-indigo-600 hover:underline font-medium block truncate"
              title={originalMsg.attachment.fileName}
              target="_blank"
              rel="noreferrer"
            >
              <IconPaperclip /> {originalMsg.attachment.fileName}
            </a>
          ) : (
            <span className="text-xs text-slate-400">No email</span>
          )}
        </div>
        <div>
          <span className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-0.5">Status</span>
          <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase ${statusBadgeClass(thread.status)}`}>
            {formatQueryStatus(thread.status)}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 text-left">
        {/* LEFT COLUMN: Mail Drafter & Conversation History */}
        <div className="space-y-6">
          {/* Main Action Block - Reply Editor */}
          <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-base font-bold text-slate-800">
                Compose Response
              </h2>
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${statusBadgeClass(thread.status)}`}>
                {formatQueryStatus(thread.status)}
              </span>
            </div>

            {success && (
              <p className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-800">
                {success}
              </p>
            )}

            {error && (
              <p className="rounded-md border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-800">
                {error}
              </p>
            )}

            {resolved ? (
              <div className="rounded-lg bg-slate-50 p-4 text-center border border-slate-200">
                <p className="text-sm text-slate-500 font-medium">This query has been resolved.</p>
                <p className="text-xs text-slate-400 mt-1">No further replies can be sent.</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">Message Body</label>
                  <textarea
                    value={replyBody}
                    onChange={(e) => setReplyBody(e.target.value)}
                    placeholder="Draft your response here..."
                    className="min-h-[220px] w-full resize-y rounded border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
                  />
                </div>

                <div className="border-t border-slate-100 pt-3">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1 flex items-center gap-1">
                    <IconPaperclip /> Attachments
                  </label>
                  <div className="flex flex-wrap items-center gap-2 mt-1">
                    {attachments.map((att, idx) => (
                      <button
                        key={`${att.fileName}-${idx}`}
                        type="button"
                        onClick={() => setAttachments((prev) => prev.filter((_, i) => i !== idx))}
                        className="inline-flex items-center gap-1 rounded-full border border-teal-200 bg-teal-50 px-2.5 py-1 text-xs text-teal-700 hover:bg-teal-100"
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
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => router.back()}
                    className="rounded border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={handleExportEml}
                    className="rounded border border-indigo-200 bg-indigo-50 px-4 py-2 text-sm font-semibold text-indigo-700 hover:bg-indigo-100 flex items-center justify-center gap-1.5"
                  >
                    Export Draft (.eml)
                  </button>
                  <button
                    type="button"
                    disabled={sending}
                    onClick={handleSend}
                    className="rounded bg-teal-600 px-5 py-2 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-60 flex items-center"
                  >
                    {sending ? 'Sending...' : (
                      <>
                        Send Reply <IconMail />
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Conversation History */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400">
              Conversation Thread ({replies.length} replies)
            </h3>
            <div className="space-y-3">
              {replies.length === 0 ? (
                <p className="text-xs text-slate-400 italic">No replies have been sent yet.</p>
              ) : (
                replies.map((reply) => (
                  <div key={reply.id} className="rounded-lg border border-teal-100 bg-teal-50/50 p-4 shadow-sm">
                    <div className="flex items-center justify-between border-b border-teal-100/50 pb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-teal-900 text-xs">{reply.authorName}</span>
                        {reply.authorRole && (
                          <span className="text-[10px] text-teal-600 font-medium">({reply.authorRole})</span>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-400">
                        {new Date(reply.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">{reply.body}</p>
                    {reply.attachments?.map((att, idx) => (
                      <a
                        key={`reply-att-${idx}`}
                        href={user ? `${att.url}?actorId=${user.id}` : att.url}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-2 inline-flex items-center gap-1 text-xs text-indigo-600 hover:underline"
                      >
                        <IconPaperclip /> {att.fileName}
                      </a>
                    ))}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Outlook-style .msg File Preview */}
        <div className="space-y-6">
          <div className="rounded-lg border border-slate-200 bg-white shadow-sm overflow-hidden flex flex-col h-full min-h-[600px]">
            {/* Header section representing an email client window */}
            <div className="bg-slate-100 border-b border-slate-200 px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-rose-400"></span>
                <span className="w-3 h-3 rounded-full bg-amber-400"></span>
                <span className="w-3 h-3 rounded-full bg-emerald-400"></span>
                <span className="text-xs font-semibold text-slate-500 ml-2">Outlook Email Preview (.msg)</span>
              </div>
              {originalMsg?.attachments?.[0] && (
                <a
                  href={user ? `${originalMsg.attachments[0].url}?actorId=${user.id}` : originalMsg.attachments[0].url}
                  download
                  className="text-xs text-indigo-600 hover:underline flex items-center gap-1"
                >
                  <IconDownload /> Download Raw File
                </a>
              )}
            </div>

            {parsingMsg ? (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-slate-400">
                <svg className="animate-spin h-8 w-8 text-teal-600 mb-3" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <p className="text-sm">Reading compound OLE Outlook file...</p>
              </div>
            ) : parsedMsg ? (
              <div className="flex-1 flex flex-col">
                {/* Email Header Panel */}
                <div className="bg-slate-50/50 p-4 border-b border-slate-150 space-y-2 text-sm">
                  <div>
                    <span className="font-semibold text-slate-500 mr-2">From:</span>
                    <span className="font-medium text-slate-800">{parsedMsg.senderName}</span>{' '}
                    <span className="text-slate-400">&lt;{parsedMsg.senderEmail}&gt;</span>
                  </div>
                  <div>
                    <span className="font-semibold text-slate-500 mr-2">Subject:</span>
                    <span className="font-bold text-slate-900">{parsedMsg.subject}</span>
                  </div>
                  {parsedMsg.creationTime && (
                    <div>
                      <span className="font-semibold text-slate-500 mr-2">Date:</span>
                      <span className="text-slate-600">{new Date(parsedMsg.creationTime).toLocaleString()}</span>
                    </div>
                  )}
                </div>

                {/* Email Body Content */}
                <div className="flex-1 p-6 overflow-y-auto whitespace-pre-wrap text-sm text-slate-700 font-sans leading-relaxed bg-white">
                  {parsedMsg.body}
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-slate-400 text-center">
                <svg className="w-10 h-10 text-slate-300 mb-2" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                  <polyline points="22,6 12,13 2,6"></polyline>
                </svg>
                <p className="text-sm font-semibold text-slate-600">No Outlook Email preview available</p>
                {originalMsg?.body ? (
                  <div className="mt-4 text-left w-full max-w-md bg-slate-50 rounded border border-slate-200 p-4">
                    <p className="text-xs uppercase tracking-wider text-slate-400 font-bold mb-1">Issue details from DB</p>
                    <p className="text-xs text-slate-600 whitespace-pre-wrap">{originalMsg.body}</p>
                  </div>
                ) : null}
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default ReplyPage;
