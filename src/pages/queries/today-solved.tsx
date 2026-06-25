import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Layout from '../../components/Layout';
import QueryTabs from '../../components/QueryTabs';
import { authHeaders, useAuth } from '../_app';

interface TodaySolvedQuery {
  id: number;
  queryCode: string;
  clientName?: string;
  state?: string;
  generatedBy?: string;
  assignedTo?: string;
  solvedBy?: string;
  queryEntryDate?: string;
  queryAssignDate?: string;
  resolvedAt: string;
}

interface SolvedFilters {
  dateSolvedFrom: string;
  dateSolvedTo: string;
  generatedBy: string;
  solvedBy: string;
}

const emptyFilters = (): SolvedFilters => ({
  dateSolvedFrom: '',
  dateSolvedTo: '',
  generatedBy: '',
  solvedBy: '',
});

const cell = (value: string | undefined): string => value ?? '—';

const formatDate = (iso: string | undefined): string => {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString();
};

const TodaySolvedPage: React.FC = () => {
  const { user } = useAuth();
  const [queries, setQueries] = useState<TodaySolvedQuery[]>([]);
  const [allQueries, setAllQueries] = useState<TodaySolvedQuery[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<SolvedFilters>(emptyFilters);
  const filtersInitialized = useRef(false);

  const canView =
    !!user && user.role && ['ADMIN', 'MANAGER', 'KAM'].includes(user.role);

  const buildSearchParams = useCallback((f: SolvedFilters): string => {
    const params = new URLSearchParams();
    if (f.dateSolvedFrom) params.set('dateSolvedFrom', f.dateSolvedFrom);
    if (f.dateSolvedTo) params.set('dateSolvedTo', f.dateSolvedTo);
    if (f.generatedBy) params.set('generatedBy', f.generatedBy);
    if (f.solvedBy) params.set('solvedBy', f.solvedBy);
    const qs = params.toString();
    return qs ? `?${qs}` : '';
  }, []);

  const loadQueries = useCallback(
    async (f: SolvedFilters) => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/queries/today-solved${buildSearchParams(f)}`, {
          headers: authHeaders(),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || 'Failed to load resolved tickets');
        }
        const data = await res.json();
        setQueries(data.queries || []);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to load data');
      } finally {
        setLoading(false);
      }
    },
    [buildSearchParams],
  );

  useEffect(() => {
    if (!canView) return;

    const loadOptions = async () => {
      try {
        const res = await fetch('/api/queries/today-solved', { headers: authHeaders() });
        if (res.ok) {
          const data = await res.json();
          setAllQueries(data.queries || []);
        }
      } catch {
        /* ignore */
      }
    };

    loadOptions();
    filtersInitialized.current = false;
    loadQueries(emptyFilters());
  }, [canView, loadQueries]);

  useEffect(() => {
    if (!canView) return;
    if (!filtersInitialized.current) {
      filtersInitialized.current = true;
      return;
    }
    const timer = window.setTimeout(() => {
      loadQueries(filters);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [filters, canView, loadQueries]);

  const uniqueGeneratedBy = useMemo(
    () =>
      Array.from(
        new Set(allQueries.map((q) => q.generatedBy).filter((n): n is string => !!n)),
      ).sort(),
    [allQueries],
  );

  const uniqueSolvedBy = useMemo(
    () =>
      Array.from(new Set(allQueries.map((q) => q.solvedBy).filter((n): n is string => !!n))).sort(),
    [allQueries],
  );

  const setFilter = (key: keyof SolvedFilters, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters(emptyFilters());
  };

  if (!user) {
    return (
      <Layout>
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold text-slate-900">Tickets</h2>
          <p className="text-sm text-slate-500">Please sign in to view resolved tickets.</p>
        </div>
      </Layout>
    );
  }

  if (!canView) {
    return (
      <Layout>
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold text-slate-900">Tickets</h2>
          <p className="text-sm text-slate-500">You are not authorized to view this page.</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-4">
        <QueryTabs active="ASSIGN" />

        <div className="flex flex-wrap items-end gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div>
            <label className="block text-xs font-medium text-slate-500">Date From</label>
            <input
              type="date"
              value={filters.dateSolvedFrom}
              onChange={(e) => setFilter('dateSolvedFrom', e.target.value)}
              className="mt-1 rounded-md border border-slate-200 px-2 py-1.5 text-sm text-slate-800"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500">Date To</label>
            <input
              type="date"
              value={filters.dateSolvedTo}
              onChange={(e) => setFilter('dateSolvedTo', e.target.value)}
              className="mt-1 rounded-md border border-slate-200 px-2 py-1.5 text-sm text-slate-800"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500">Generated by</label>
            <select
              value={filters.generatedBy}
              onChange={(e) => setFilter('generatedBy', e.target.value)}
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
              value={filters.solvedBy}
              onChange={(e) => setFilter('solvedBy', e.target.value)}
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
            {queries.length} resolved
          </span>
          <span className="text-xs text-slate-500">{queries.length} tickets</span>
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
                    Ticket ID
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-white">
                    Client
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-white">
                    Generated on
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-white">
                    Generated by
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-white">
                    Assigned to
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-white">
                    Solved by
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-white">
                    Resolved at
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {loading && (
                  <tr>
                    <td colSpan={8} className="px-4 py-6 text-center text-sm text-slate-500">
                      Loading resolved tickets...
                    </td>
                  </tr>
                )}
                {!loading && queries.length === 0 && !error && (
                  <tr>
                    <td colSpan={8} className="px-4 py-6 text-center text-sm text-slate-500">
                      No resolved tickets found.
                    </td>
                  </tr>
                )}
                {!loading &&
                  queries.map((q, index) => (
                    <tr key={q.id}>
                      <td className="px-4 py-2 text-slate-800">{index + 1}</td>
                      <td className="px-4 py-2 font-mono text-xs font-semibold text-teal-700">
                        {q.queryCode}
                      </td>
                      <td className="px-4 py-2 text-slate-800">{cell(q.clientName)}</td>
                      <td className="px-4 py-2 text-slate-700">{formatDate(q.queryEntryDate)}</td>
                      <td className="px-4 py-2 text-slate-700">{cell(q.generatedBy)}</td>
                      <td className="px-4 py-2 text-slate-700">{cell(q.assignedTo)}</td>
                      <td className="px-4 py-2 text-slate-700">{cell(q.solvedBy)}</td>
                      <td className="px-4 py-2 text-slate-700">
                        <span className="text-xs text-slate-500">
                          {new Date(q.resolvedAt).toLocaleString()}
                        </span>
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

export default TodaySolvedPage;
