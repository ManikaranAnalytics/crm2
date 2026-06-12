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
  const showRaisedBy = !!user && (user.role === 'ADMIN' || user.role === 'MANAGER');
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

  const subtitle =
    user?.role === 'KAM'
      ? 'Replies received on your queries'
      : 'Showing all queries with replies';

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
      <style>{`
        .inbox-page { font-family: Arial, sans-serif; color: #1e293b; }
        .inbox-title { font-size: 24px; font-weight: bold; margin: 0 0 4px 0; }
        .inbox-subtitle { font-size: 14px; color: #64748b; margin: 0 0 16px 0; }
        .filter-bar {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
          align-items: flex-end;
          margin-bottom: 16px;
          padding: 16px;
          background: #fff;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          box-shadow: 0 1px 2px rgba(0,0,0,0.05);
        }
        .filter-bar label { display: block; font-size: 12px; color: #64748b; margin-bottom: 4px; }
        .filter-control {
          border: 1px solid #cbd5e1;
          border-radius: 4px;
          padding: 6px 10px;
          font-size: 14px;
          color: #1e293b;
        }
        .count-badge {
          display: inline-flex;
          align-items: center;
          border-radius: 9999px;
          background: #f0fdfa;
          padding: 2px 10px;
          font-size: 12px;
          font-weight: 500;
          color: #0f766e;
          margin-bottom: 12px;
        }
        .table-wrap {
          overflow: hidden;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          background: #fff;
          box-shadow: 0 1px 2px rgba(0,0,0,0.05);
        }
        .data-table { width: 100%; border-collapse: collapse; font-size: 14px; }
        .data-table th {
          background: #0f766e;
          color: white;
          text-align: left;
          padding: 10px 12px;
          font-size: 13px;
          border: 1px solid #334155;
        }
        .data-table td {
          padding: 10px 12px;
          border: 1px solid #e2e8f0;
        }
        .data-table tr:nth-child(even) td { background: #f9f9f9; }
        .data-table tr:nth-child(odd) td { background: white; }
        .data-table tbody tr.clickable { cursor: pointer; }
        .data-table tbody tr.clickable:hover td { background: #f1f5f9; }
        .query-code { font-family: monospace; font-size: 12px; font-weight: 600; color: #0f766e; }
        .date-cell { font-size: 12px; color: #64748b; }
        .status-msg { padding: 24px; text-align: center; color: #64748b; font-size: 14px; }
        .error-msg { color: #b91c1c; margin-bottom: 12px; font-size: 14px; }
      `}</style>

      <div className="inbox-page">
        <QueryTabs active="REPLIES" />

        <div className="filter-bar">
          <div>
            <label htmlFor="searchCode">Search Code</label>
            <input
              id="searchCode"
              type="text"
              placeholder="Search by Query Code..."
              value={searchCode}
              onChange={(e) => setSearchCode(e.target.value)}
              className="filter-control border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-teal-500"
            />
          </div>
          <div>
            <label htmlFor="dateFrom">Date From</label>
            <input
              id="dateFrom"
              type="date"
              className="filter-control"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="dateTo">Date To</label>
            <input
              id="dateTo"
              type="date"
              className="filter-control"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
            />
          </div>
          {showAdminFilters && (
            <>
              <div>
                <label htmlFor="generatedBy">Generated by</label>
                <select
                  id="generatedBy"
                  className="filter-control"
                  value={filterGenBy}
                  onChange={(e) => setFilterGenBy(e.target.value)}
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
                <label htmlFor="solvedBy">Solved by</label>
                <select
                  id="solvedBy"
                  className="filter-control"
                  value={filterSolvedBy}
                  onChange={(e) => setFilterSolvedBy(e.target.value)}
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

        <span className="count-badge">{filteredRows.length} queries</span>

        {error && <p className="error-msg">{error}</p>}

        <div className="table-wrap">
          {loading && <p className="status-msg">Loading replies…</p>}

          {!loading && filteredRows.length === 0 && !error && (
            <p className="status-msg">No replies received yet.</p>
          )}

          {!loading && filteredRows.length > 0 && (
            <table className="data-table">
              <thead>
                <tr>
                  <th className="px-4 py-2 text-left">S.No.</th>
                  <th>Query Code</th>
                  <th>Client</th>
                  <th>Generated by</th>
                  <th>Solved by</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.map(({ meta, replies: queryReplies }, index) => {
                  const latest = queryReplies[0];
                  return (
                    <tr
                      key={meta.query_id}
                      className="clickable"
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
                      <td className="px-4 py-2">{index + 1}</td>
                      <td className="query-code">{meta.query_code}</td>
                      <td>{cell(meta.client_name)}</td>
                      <td>{cell(meta.raised_by)}</td>
                      <td>{cell(latest.replied_by)}</td>
                      <td className="date-cell">{formatDate(latest.replied_at)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default RepliesInboxPage;
