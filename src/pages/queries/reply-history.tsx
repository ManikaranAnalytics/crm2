import React, { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Layout from '../../components/Layout';
import QueryDetailsPanel from '../../components/QueryDetailsPanel';
import OutlookEmailPreview from '../../components/OutlookEmailPreview';
import ReplyThreadPanel from '../../components/ReplyThreadPanel';
import { authHeaders, useAuth } from '../_app';
import { formatQueryStatus, statusBadgeClass } from '../../lib/queryStatus';
import type { QueryThread } from '../../services/queryService';

const ReplyHistoryPage: React.FC = () => {
  const { user } = useAuth();
  const router = useRouter();
  const { id } = router.query;

  const [thread, setThread] = useState<QueryThread | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
        throw new Error(body.error || 'Failed to load reply history');
      }
      const data = await res.json();
      setThread(data.thread);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load reply history');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (id && user) {
      loadThread();
    }
  }, [id, user, loadThread]);

  if (!user) {
    return (
      <Layout>
        <div className="p-6 text-center">
          <p className="text-slate-500">Please sign in to view ticket responses.</p>
        </div>
      </Layout>
    );
  }

  if (loading) {
    return (
      <Layout>
        <div className="p-6 text-center text-slate-500">Loading reply history...</div>
      </Layout>
    );
  }

  if (!thread) {
    return (
      <Layout>
        <div className="p-6 text-center text-red-500">
          {error || 'Ticket not found.'}
        </div>
      </Layout>
    );
  }

  const replies = thread.messages.filter((m) => m.type === 'REPLY');

  return (
    <Layout>
      <QueryDetailsPanel thread={thread} />

      <div className="mt-4 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h2 className="text-base font-bold text-slate-800">Reply History</h2>
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${statusBadgeClass(thread.status)}`}>
              {formatQueryStatus(thread.status)}
            </span>
          </div>
          <button
            type="button"
            onClick={() => router.push('/queries/replies-inbox')}
            className="rounded border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
          >
            Back to Tickets
          </button>
        </div>

        {error && (
          <p className="rounded-md border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-800">
            {error}
          </p>
        )}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <OutlookEmailPreview thread={thread} actorId={user.id} />

          <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <ReplyThreadPanel replies={replies} actorId={user.id} />
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default ReplyHistoryPage;
