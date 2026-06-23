import React, { useEffect, useMemo, useState } from 'react';
import { authHeaders } from '../pages/_app';
import type { QueryThread } from '../services/queryService';

const IconDownload = () => (
  <svg className="w-3.5 h-3.5 inline mr-1" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
    <polyline points="7 10 12 15 17 10"></polyline>
    <line x1="12" y1="15" x2="12" y2="3"></line>
  </svg>
);

export interface ParsedOutlookMsg {
  subject: string;
  senderName: string;
  senderEmail: string;
  body: string;
  creationTime: string;
}

interface OutlookEmailPreviewProps {
  thread: QueryThread;
  actorId?: number;
  onParsedMsgLoaded?: (msg: ParsedOutlookMsg | null) => void;
}

const OutlookEmailPreview: React.FC<OutlookEmailPreviewProps> = ({ thread, actorId, onParsedMsgLoaded }) => {
  const [parsedMsg, setParsedMsg] = useState<ParsedOutlookMsg | null>(null);
  const [parsingMsg, setParsingMsg] = useState(false);

  const originalMsg = thread.messages.find((m) => m.type === 'ORIGINAL');
  const msgAttachment = useMemo(() => {
    const fromList = originalMsg?.attachments?.find((a) => a.url.toLowerCase().endsWith('.msg'));
    if (fromList) return fromList;
    if (originalMsg?.attachment?.url.toLowerCase().endsWith('.msg')) {
      return originalMsg.attachment;
    }
    return undefined;
  }, [originalMsg]);

  useEffect(() => {
    if (!msgAttachment?.url.toLowerCase().endsWith('.msg')) {
      setParsedMsg(null);
      return;
    }

    const filename = msgAttachment.url.replace('/api/attachments/', '');
    let cancelled = false;

    const loadParsedMsg = async () => {
      setParsingMsg(true);
      try {
        const res = await fetch(
          `/api/attachments/parse-msg?filename=${encodeURIComponent(filename)}&actorId=${actorId ?? ''}`,
          { headers: authHeaders() },
        );
        if (res.ok && !cancelled) {
          const data = await res.json();
          setParsedMsg(data);
        }
      } catch {
        // ignore parsing failure, fallback to raw details
      } finally {
        if (!cancelled) setParsingMsg(false);
      }
    };

    loadParsedMsg();
    return () => {
      cancelled = true;
    };
  }, [msgAttachment, actorId]);

  useEffect(() => {
    onParsedMsgLoaded?.(parsedMsg);
  }, [parsedMsg, onParsedMsgLoaded]);

  const attachmentHref = (url: string) => (actorId ? `${url}?actorId=${actorId}` : url);

  return (
    <div className="rounded-lg border border-slate-200 bg-white shadow-sm overflow-hidden flex flex-col min-h-[600px]">
      <div className="bg-slate-100 border-b border-slate-200 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-rose-400"></span>
          <span className="w-3 h-3 rounded-full bg-amber-400"></span>
          <span className="w-3 h-3 rounded-full bg-emerald-400"></span>
          <span className="text-xs font-semibold text-slate-500 ml-2">Original Email Preview (.msg)</span>
        </div>
        {msgAttachment && (
          <a
            href={attachmentHref(msgAttachment.url)}
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
              <p className="text-xs uppercase tracking-wider text-slate-400 font-bold mb-1">Original query details</p>
              <p className="text-xs text-slate-600 whitespace-pre-wrap">{originalMsg.body}</p>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
};

export default OutlookEmailPreview;
