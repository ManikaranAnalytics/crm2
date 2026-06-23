import React from 'react';

const IconPaperclip = () => (
  <svg className="w-3.5 h-3.5 inline mr-1" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
    <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path>
  </svg>
);

interface AttachmentItem {
  fileName: string;
  url: string;
}

export interface ReplyThreadMessage {
  id: string;
  type: 'ORIGINAL' | 'REPLY';
  authorName: string;
  authorRole?: string;
  body: string;
  createdAt: string;
  attachments?: AttachmentItem[];
}

interface ReplyThreadPanelProps {
  replies: ReplyThreadMessage[];
  actorId?: number;
}

const ReplyThreadPanel: React.FC<ReplyThreadPanelProps> = ({ replies, actorId }) => (
  <div className="space-y-4">
    <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400">
      Reply Conversation Thread ({replies.length} replies)
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
                href={actorId ? `${att.url}?actorId=${actorId}` : att.url}
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
);

export default ReplyThreadPanel;
