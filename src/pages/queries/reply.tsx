import React, { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Layout from '../../components/Layout';
import QueryDetailsPanel from '../../components/QueryDetailsPanel';
import OutlookEmailPreview, { type ParsedOutlookMsg } from '../../components/OutlookEmailPreview';
import { authHeaders, useAuth } from '../_app';
import { formatQueryStatus, isQueryResolved, statusBadgeClass } from '../../lib/queryStatus';
import type { QueryThread } from '../../services/queryService';

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
  const [parsedMsg, setParsedMsg] = useState<ParsedOutlookMsg | null>(null);
  const [loading, setLoading] = useState(true);
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
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load conversation');
    } finally {
      setLoading(false);
    }
  }, [id]);

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

    const handleRouteChangeStart = () => {
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
          <p className="text-slate-500">Please sign in to view query conversations.</p>
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
  const canReply = !!user && ['ADMIN', 'MANAGER'].includes(user.role);

  return (
    <Layout>
      <QueryDetailsPanel thread={thread} />

      <div className="mt-4 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h2 className="text-base font-bold text-slate-800">
              {canReply ? 'Compose Response' : 'Query Conversation'}
            </h2>
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${statusBadgeClass(thread.status)}`}>
              {formatQueryStatus(thread.status)}
            </span>
          </div>
          <button
            type="button"
            onClick={() => router.push('/queries/assign')}
            className="rounded border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
          >
            Back to Reply to Queries
          </button>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <OutlookEmailPreview
            thread={thread}
            actorId={user.id}
            onParsedMsgLoaded={setParsedMsg}
          />

          <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm space-y-4">
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

            {!canReply ? (
              <div className="rounded-lg bg-slate-50 p-4 text-center border border-slate-200">
                <p className="text-sm text-slate-500 font-medium">Read-only conversation view.</p>
                <p className="text-xs text-slate-400 mt-1">Replies are sent by managers and admins.</p>
              </div>
            ) : resolved ? (
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
        </div>
      </div>
    </Layout>
  );
};

export default ReplyPage;
