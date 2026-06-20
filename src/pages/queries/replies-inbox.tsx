import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import Layout from '../../components/Layout';
import QueryTabs from '../../components/QueryTabs';
import { authHeaders, useAuth } from '../_app';

interface ReplyItem {
  query_id: number;
  query_code: string;
  current_status: string;
  state?: string;
  capacity_mw?: number;
  technology?: string;
  transmission_type?: string;
  period_of_issue?: string;
  query_raised_date?: string;
  pss_text?: string;
  raised_by?: string;
  client_name?: string;
  reply_id: number;
  reply_body: string;
  replied_at: string;
  replied_by: string;
  replied_by_role: string;
  attachment_name?: string;
  attachment_url?: string;
}

const cell = (value: string | undefined): string => value ?? '—';

const formatDate = (iso: string): string => new Date(iso).toLocaleString();

const RepliesInboxPage: React.FC = () => {
  const { user } = useAuth();
  const router = useRouter();
  const [replies, setReplies] = useState<ReplyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [filterGenBy, setFilterGenBy] = useState('');
  const [filterSolvedBy, setFilterSolvedBy] = useState('');
  const [searchCode, setSearchCode] = useState('');

  const canView = !!user && ['ADMIN', 'MANAGER', 'KAM'].includes(user.role);

  const showAdminFilters = !!user && (user.role === 'ADMIN' || user.role === 'MANAGER');

  useEffect(() => {
    if (!canView) return;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch('/api/queries/replies-inbox', {
          headers: authHeaders(),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || 'Failed to load replies');
        }
        const data = await res.json();
        setReplies(data.replies || []);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to load replies');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [canView]);

  const uniqueGeneratedBy = useMemo(
    () =>
      Array.from(new Set(replies.map((r) => r.raised_by).filter((n): n is string => !!n))).sort(),
    [replies],
  );

  const uniqueSolvedBy = useMemo(
    () => Array.from(new Set(replies.map((r) => r.replied_by))).sort(),
    [replies],
  );

  const filteredReplies = useMemo(() => {
    let filtered = replies;
    if (dateFrom) filtered = filtered.filter((r) => r.replied_at >= dateFrom);
    if (dateTo) filtered = filtered.filter((r) => r.replied_at <= dateTo + 'T23:59:59');
    if (filterGenBy) filtered = filtered.filter((r) => r.raised_by === filterGenBy);
    if (filterSolvedBy) filtered = filtered.filter((r) => r.replied_by === filterSolvedBy);
    return filtered;
  }, [replies, dateFrom, dateTo, filterGenBy, filterSolvedBy]);

  const rows = useMemo(() => {
    const grouped = filteredReplies.reduce(
      (acc, reply) => {
        const key = reply.query_id;
        if (!acc[key]) acc[key] = { meta: reply, replies: [] };
        acc[key].replies.push(reply);
        return acc;
      },
      {} as Record<number, { meta: ReplyItem; replies: ReplyItem[] }>,
    );

    const list = Object.values(grouped);
    list.sort(
      (a, b) =>
        new Date(b.replies[0].replied_at).getTime() - new Date(a.replies[0].replied_at).getTime(),
    );
    return list;
  }, [filteredReplies]);

  const filteredRows = useMemo(() => {
    if (!searchCode.trim()) return rows;
    const q = searchCode.trim().toLowerCase();
    return rows.filter((r) => r.meta.query_code?.toLowerCase().includes(q));
  }, [rows, searchCode]);

  const clearFilters = () => {
    setDateFrom('');
    setDateTo('');
    setFilterGenBy('');
    setFilterSolvedBy('');
    setSearchCode('');
  };



  if (!user) {
    return (
      <Layout>
        <p>Please sign in to view query replies.</p>
      </Layout>
    );
  }

  if (!canView) {
    return (
      <Layout>
        <p>Not authorized</p>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-4">
        <QueryTabs active="REPLIES" />

        <div className="flex flex-wrap items-end gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div>
            <label className="block text-xs font-medium text-slate-500">Search Code</label>
            <input
              id="searchCode"
              type="text"
              placeholder="Search by Query Code..."
              value={searchCode}
              onChange={(e) => setSearchCode(e.target.value)}
              className="mt-1 rounded-md border border-slate-200 px-2 py-1.5 text-sm text-slate-800"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500">Date From</label>
            <input
              id="dateFrom"
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="mt-1 rounded-md border border-slate-200 px-2 py-1.5 text-sm text-slate-800"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500">Date To</label>
            <input
              id="dateTo"
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="mt-1 rounded-md border border-slate-200 px-2 py-1.5 text-sm text-slate-800"
            />
          </div>
          {showAdminFilters && (
            <>
              <div>
                <label className="block text-xs font-medium text-slate-500">Generated by</label>
                <select
                  id="generatedBy"
                  value={filterGenBy}
                  onChange={(e) => setFilterGenBy(e.target.value)}
                  className="mt-1 rounded-md border border-slate-200 px-2 py-1.5 text-sm text-slate-800"
                >
                  <option value="">All</option>
                  {uniqueGeneratedBy.map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500">Solved by</label>
                <select
                  id="solvedBy"
                  value={filterSolvedBy}
                  onChange={(e) => setFilterSolvedBy(e.target.value)}
                  className="mt-1 rounded-md border border-slate-200 px-2 py-1.5 text-sm text-slate-800"
                >
                  <option value="">All</option>
                  {uniqueSolvedBy.map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}
          <button
            type="button"
            onClick={clearFilters}
            style={{
              background: '#ef4444',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              padding: '6px 14px',
              cursor: 'pointer',
              fontWeight: 500,
            }}
          >
            Clear
          </button>
        </div>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center rounded-full bg-teal-50 px-2.5 py-0.5 text-xs font-medium text-teal-700">
            {filteredRows.length} resolved
          </span>
          <span className="text-xs text-slate-500">{filteredRows.length} queries</span>
        </div>

        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          {error && (
            <p className="border-b border-slate-100 bg-red-50 px-4 py-2 text-sm text-red-700">
              {error}
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
                    Query Code
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-white">
                    Client
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-white">
                    Generated by
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-white">
                    Solved by
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-white">
                    Date
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {loading && (
                  <tr>
                    <td colSpan={6} className="px-4 py-6 text-center text-sm text-slate-500">
                      Loading replies…
                    </td>
                  </tr>
                )}
                {!loading && filteredRows.length === 0 && !error && (
                  <tr>
                    <td colSpan={6} className="px-4 py-6 text-center text-sm text-slate-500">
                      No replies received yet.
                    </td>
                  </tr>
                )}
                {!loading &&
                  filteredRows.map(({ meta, replies: queryReplies }, index) => {
                    const latest = queryReplies[0];
                    return (
                      <tr
                        key={meta.query_id}
                        className="cursor-pointer border-l-2 border-l-transparent transition-colors hover:bg-slate-50"
                        onClick={() => router.push(`/queries/reply?id=${meta.query_id}`)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            router.push(`/queries/reply?id=${meta.query_id}`);
                          }
                        }}
                        tabIndex={0}
                        role="button"
                      >
                        <td className="px-4 py-2 text-slate-800">{index + 1}</td>
                        <td className="px-4 py-2 font-mono text-xs font-semibold text-teal-700">
                          {meta.query_code}
                        </td>
                        <td className="px-4 py-2 text-slate-800">{cell(meta.client_name)}</td>
                        <td className="px-4 py-2 text-slate-700">{cell(meta.raised_by)}</td>
                        <td className="px-4 py-2 text-slate-700">{cell(latest.replied_by)}</td>
                        <td className="px-4 py-2 text-slate-700">
                          <span className="text-xs text-slate-500">
                            {formatDate(latest.replied_at)}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default RepliesInboxPage;
