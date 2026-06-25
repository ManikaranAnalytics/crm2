import React, { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Layout from '../../components/Layout';
import QueryTabs from '../../components/QueryTabs';
import { formatQueryStatus, isQueryActive, statusBadgeClass } from '../../lib/queryStatus';
import { useAuth } from '../_app';

interface AssignedQuery {
  id: number;
  queryCode: string;
  clientName?: string;
  state?: string;
  status: string;
  responsibilityTo?: string;
  responsibilityToId?: number;
  queryAssignDate?: string;
  raisedBy?: string;
  attachments?: { fileName: string; url: string }[];
}

const rowAccentClass = (status: string): string => {
  if (status === 'IN_PROGRESS') return 'border-l-amber-400';
  if (status === 'OPEN') return 'border-l-amber-400';
  if (status === 'CLOSED') return 'border-l-emerald-400';
  return 'border-l-amber-400';
};

const AssignQueriesPage: React.FC = () => {
  const { user } = useAuth();
  const router = useRouter();
  const [queries, setQueries] = useState<AssignedQuery[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const canReply = !!user && ['ADMIN', 'MANAGER'].includes(user.role);

  const loadQueries = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/queries/assign?actorId=${user.id}`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || 'Failed to load active tickets');
      }
      const body = await res.json();
      setQueries(body.queries || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadQueries();
  }, [loadQueries]);


  if (!user) {
    return (
      <Layout>
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold text-slate-900">Tickets</h2>
          <p className="text-sm text-slate-500">Please sign in to view active tickets.</p>
        </div>
      </Layout>
    );
  }

  if (!canReply) {
    return (
      <Layout>
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold text-slate-900">Tickets</h2>
          <p className="text-sm text-slate-500">You are not authorized to respond to tickets.</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-4">
        <QueryTabs active="ASSIGN" />
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          {error && (
            <p className="border-b border-slate-100 bg-red-50 px-4 py-2 text-sm text-red-700">
              {error}
            </p>
          )}
          {success && (
            <p className="border-b border-slate-100 bg-emerald-50 px-4 py-2 text-sm text-emerald-700">
              {success}
            </p>
          )}
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-[#0f766e]">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-white">
                    S.No.
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-white">
                    Ticket ID
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-white">
                    Client
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-white">
                    Raised by
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-white">
                    Assigned to
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-white">
                    Email (.msg / .eml)
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-white">
                    Status
                  </th>
                  <th className="px-4 py-2 text-right text-xs font-semibold uppercase tracking-wide text-white">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {loading && (
                  <tr>
                    <td colSpan={8} className="px-4 py-6 text-center text-sm text-slate-500">
                      Loading active tickets...
                    </td>
                  </tr>
                )}
                {!loading && queries.length === 0 && !error && (
                  <tr>
                    <td colSpan={8} className="px-4 py-6 text-center text-sm text-slate-500">
                      No active tickets awaiting reply.
                    </td>
                  </tr>
                )}
                {!loading &&
                  queries.map((q, index) => (
                    <tr
                      key={q.id}
                      className="transition-colors hover:bg-slate-50"
                    >
                      <td
                        className={`border-l-2 ${rowAccentClass(q.status)} px-4 py-2 text-slate-800`}
                      >
                        {index + 1}
                      </td>
                      <td className="px-4 py-2 font-mono text-xs font-semibold text-teal-700">
                        {q.queryCode}
                      </td>
                      <td className="px-4 py-2 text-slate-800">{q.clientName || '-'}</td>
                      <td className="px-4 py-2 text-slate-700">{q.raisedBy || '-'}</td>
                      <td className="px-4 py-2 text-slate-700">{q.responsibilityTo || '-'}</td>
                      <td className="px-4 py-2 text-[11px] text-slate-700">
                        {q.attachments && q.attachments.length > 0 ? (
                          <a
                            href={user ? `${q.attachments[0].url}?actorId=${user.id}` : q.attachments[0].url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-indigo-600 hover:underline"
                          >
                            {q.attachments[0].fileName}
                          </a>
                        ) : (
                          <span className="text-slate-400">No email</span>
                        )}
                      </td>
                      <td className="px-4 py-2">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${statusBadgeClass(q.status)}`}
                        >
                          {formatQueryStatus(q.status)}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => router.push(`/queries/reply?id=${q.id}`)}
                            className="rounded-md border border-teal-200 px-3 py-1.5 text-xs font-medium text-teal-700 hover:bg-teal-50"
                          >
                            View thread
                          </button>
                          {isQueryActive(q.status) && (
                            <button
                              type="button"
                              onClick={() => router.push(`/queries/reply?id=${q.id}`)}
                              className="rounded-md bg-teal-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-teal-700"
                            >
                              Reply
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default AssignQueriesPage;
