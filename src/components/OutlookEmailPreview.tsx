import React, { useEffect, useMemo, useState } from 'react';
import EmailViewer from './EmailViewer';
import { authHeaders } from '../pages/_app';
import type { QueryThread } from '../services/queryService';
import type { ParsedOutlookMsg } from '../lib/email/types';

export type { ParsedOutlookMsg };

const IconDownload = () => (
  <svg className="mr-1 inline h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
    <polyline points="7 10 12 15 17 10"></polyline>
    <line x1="12" y1="15" x2="12" y2="3"></line>
  </svg>
);

interface OutlookEmailPreviewProps {
  thread: QueryThread;
  actorId?: number;
  onParsedMsgLoaded?: (msg: ParsedOutlookMsg | null) => void;
}

const OutlookEmailPreview: React.FC<OutlookEmailPreviewProps> = ({ thread, actorId, onParsedMsgLoaded }) => {
  const [parsedMsg, setParsedMsg] = useState<ParsedOutlookMsg | null>(null);
  const [parsingMsg, setParsingMsg] = useState(false);

  const originalMsg = thread.messages.find((m) => m.type === 'ORIGINAL');
  const emailAttachment = useMemo(() => {
    const candidates = [
      ...(originalMsg?.attachments || []),
      ...(originalMsg?.attachment ? [originalMsg.attachment] : []),
    ];
    return candidates.find((a) => /\.(msg|eml)$/i.test(a.url));
  }, [originalMsg]);

  const sourceFileName = useMemo(() => {
    if (!emailAttachment?.url) return undefined;
    return emailAttachment.url.replace(/^\/api\/attachments\//, '');
  }, [emailAttachment]);

  useEffect(() => {
    if (!emailAttachment?.url) {
      setParsedMsg(null);
      return;
    }

    const filename = emailAttachment.url.replace('/api/attachments/', '');
    let cancelled = false;

    const loadParsedMsg = async () => {
      setParsingMsg(true);
      try {
        const res = await fetch(
          `/api/attachments/parse-msg?filename=${encodeURIComponent(filename)}&actorId=${actorId ?? ''}`,
          { headers: authHeaders() },
        );
        if (res.ok && !cancelled) {
          const data = (await res.json()) as ParsedOutlookMsg;
          setParsedMsg(data);
        }
      } catch {
        // Fallback handled by empty state below.
      } finally {
        if (!cancelled) setParsingMsg(false);
      }
    };

    loadParsedMsg();
    return () => {
      cancelled = true;
    };
  }, [emailAttachment, actorId]);

  useEffect(() => {
    onParsedMsgLoaded?.(parsedMsg);
  }, [parsedMsg, onParsedMsgLoaded]);

  const attachmentHref = (url: string) => (actorId ? `${url}?actorId=${actorId}` : url);
  const sourceLabel = emailAttachment?.url.toLowerCase().endsWith('.eml')
    ? 'Original Email Preview (.eml)'
    : emailAttachment?.url.toLowerCase().endsWith('.msg')
      ? 'Original Email Preview (.msg)'
      : 'Original Email Preview';

  return (
    <div className="flex min-h-[600px] flex-col overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-200 bg-slate-100 px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-full bg-rose-400"></span>
          <span className="h-3 w-3 rounded-full bg-amber-400"></span>
          <span className="h-3 w-3 rounded-full bg-emerald-400"></span>
          <span className="ml-2 text-xs font-semibold text-slate-500">{sourceLabel}</span>
        </div>
        {emailAttachment && (
          <a
            href={attachmentHref(emailAttachment.url)}
            download
            className="flex items-center gap-1 text-xs text-indigo-600 hover:underline"
          >
            <IconDownload /> Download Raw File
          </a>
        )}
      </div>

      {parsingMsg ? (
        <div className="flex flex-1 flex-col items-center justify-center p-8 text-slate-400">
          <svg className="mb-3 h-8 w-8 animate-spin text-teal-600" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="text-sm">Rendering email preview…</p>
        </div>
      ) : parsedMsg ? (
        <EmailViewer
          email={parsedMsg}
          sourceFileName={sourceFileName}
          actorId={actorId}
        />
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center p-8 text-center text-slate-400">
          <svg className="mb-2 h-10 w-10 text-slate-300" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
            <polyline points="22,6 12,13 2,6"></polyline>
          </svg>
          <p className="text-sm font-semibold text-slate-600">No email preview available</p>
          {originalMsg?.body ? (
            <div className="mt-4 w-full max-w-md rounded border border-slate-200 bg-slate-50 p-4 text-left">
              <p className="mb-1 text-xs font-bold uppercase tracking-wider text-slate-400">Original ticket details</p>
              <p className="whitespace-pre-wrap text-xs text-slate-600">{originalMsg.body}</p>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
};

export default OutlookEmailPreview;
