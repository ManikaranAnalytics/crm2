import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import Layout from '../../components/Layout';
import MultiSelectDropdown from '../../components/MultiSelectDropdown';
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
  query_entry_date?: string;
  query_created_at?: string;
  pss_text?: string;
  raised_by?: string;
  raised_by_id?: number;
  client_name?: string;
  reply_id?: number;
  reply_body?: string;
  replied_at?: string;
  replied_by?: string;
  replied_by_id?: number;
  replied_by_role: string;
  attachment_name?: string;
  attachment_url?: string;
}

type RepliesScope = 'my' | 'all';

interface FilterChip {
  key: string;
  label: string;
  onRemove: () => void;
}

const cell = (value: string | undefined): string => value ?? '—';

const getGeneratedAt = (item: ReplyItem): string | undefined =>
  item.query_entry_date ?? item.query_raised_date ?? item.query_created_at;

const formatDateTime = (iso: string | undefined): string => {
  if (!iso) return '—';
  return new Date(iso).toLocaleString(undefined, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const formatSolveDuration = (startIso: string | undefined, endIso: string): string => {
  if (!startIso) return '—';
  const ms = new Date(endIso).getTime() - new Date(startIso).getTime();
  if (ms < 0) return '—';
  const totalMinutes = Math.floor(ms / 60000);
  if (totalMinutes < 1) return '<1m';
  if (totalMinutes < 60) return `${totalMinutes}m`;
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  if (hours < 24) return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  const days = Math.floor(hours / 24);
  const remHours = hours % 24;
  return remHours > 0 ? `${days}d ${remHours}h` : `${days}d`;
};

const solveDurationClass = (startIso: string | undefined, endIso: string): string => {
  if (!startIso) return 'text-slate-500';
  const ms = new Date(endIso).getTime() - new Date(startIso).getTime();
  const hours = ms / 3600000;
  if (hours <= 4) return 'font-semibold text-emerald-700';
  if (hours <= 24) return 'font-medium text-amber-700';
  return 'font-medium text-red-600';
};

const CalendarIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
  </svg>
);

const EmptyState: React.FC<{ hasFilters: boolean; scope: RepliesScope }> = ({ hasFilters, scope }) => (
  <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
    <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-slate-400">
      <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
      </svg>
    </div>
    {hasFilters ? (
      <>
        <p className="text-sm font-semibold text-slate-700">No matching tickets found</p>
        <p className="mt-1 max-w-sm text-sm text-slate-500">Try changing filters or broadening your search criteria.</p>
      </>
    ) : scope === 'my' ? (
      <>
        <p className="text-sm font-semibold text-slate-700">No tickets created by you yet</p>
        <p className="mt-1 max-w-sm text-sm text-slate-500">Tickets you created will appear here once they receive a reply or are marked resolved.</p>
      </>
    ) : (
      <>
        <p className="text-sm font-semibold text-slate-700">No tickets yet</p>
        <p className="mt-1 max-w-sm text-sm text-slate-500">Tickets with replies or resolutions will appear here as your team works through them.</p>
      </>
    )}
  </div>
);

const RepliesInboxPage: React.FC = () => {
  const { user } = useAuth();
  const router = useRouter();
  const [replies, setReplies] = useState<ReplyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [selectedPss, setSelectedPss] = useState<string[]>([]);
  const [selectedClients, setSelectedClients] = useState<string[]>([]);

  const scope: RepliesScope = router.query.scope === 'my' ? 'my' : 'all';
  const canView = !!user && ['ADMIN', 'MANAGER', 'KAM'].includes(user.role);

  useEffect(() => {
    if (!canView) return;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/queries/replies-inbox?scope=${scope}`, {
          headers: authHeaders(),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || 'Failed to load tickets');
        }
        const data = await res.json();
        setReplies(data.replies || []);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to load tickets');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [canView, scope]);

  const uniquePssNames = useMemo(
    () =>
      Array.from(new Set(replies.map((r) => r.pss_text).filter((n): n is string => !!n))).sort(),
    [replies],
  );

  const uniqueClients = useMemo(
    () =>
      Array.from(new Set(replies.map((r) => r.client_name).filter((n): n is string => !!n))).sort(),
    [replies],
  );

  const filteredReplies = useMemo(() => {
    let filtered = replies;
    if (filterDateFrom) {
      filtered = filtered.filter((r) => {
        const date = r.replied_at?.slice(0, 10) ?? getGeneratedAt(r)?.slice(0, 10);
        return date ? date >= filterDateFrom : false;
      });
    }
    if (filterDateTo) {
      filtered = filtered.filter((r) => {
        const date = r.replied_at?.slice(0, 10) ?? getGeneratedAt(r)?.slice(0, 10);
        return date ? date <= filterDateTo : false;
      });
    }
    if (selectedPss.length > 0) {
      filtered = filtered.filter((r) => r.pss_text && selectedPss.includes(r.pss_text));
    }
    if (selectedClients.length > 0) {
      filtered = filtered.filter((r) => r.client_name && selectedClients.includes(r.client_name));
    }
    return filtered;
  }, [replies, filterDateFrom, filterDateTo, selectedPss, selectedClients]);

  const rows = useMemo(() => {
    const list = [...filteredReplies];
    list.sort((a, b) => {
      const aTime = a.replied_at ?? getGeneratedAt(a) ?? '';
      const bTime = b.replied_at ?? getGeneratedAt(b) ?? '';
      return new Date(bTime).getTime() - new Date(aTime).getTime();
    });
    return list.map((meta) => ({ meta, replies: meta.replied_at ? [meta] : [] }));
  }, [filteredReplies]);

  const filterChips: FilterChip[] = useMemo(() => {
    const chips: FilterChip[] = [];
    selectedClients.forEach((client) => {
      chips.push({
        key: `client-${client}`,
        label: `Client: ${client}`,
        onRemove: () => setSelectedClients((prev) => prev.filter((c) => c !== client)),
      });
    });
    selectedPss.forEach((pss) => {
      chips.push({
        key: `pss-${pss}`,
        label: `PSS: ${pss}`,
        onRemove: () => setSelectedPss((prev) => prev.filter((p) => p !== pss)),
      });
    });
    if (filterDateFrom) {
      chips.push({
        key: 'from',
        label: `From: ${filterDateFrom}`,
        onRemove: () => setFilterDateFrom(''),
      });
    }
    if (filterDateTo) {
      chips.push({
        key: 'to',
        label: `To: ${filterDateTo}`,
        onRemove: () => setFilterDateTo(''),
      });
    }
    return chips;
  }, [selectedClients, selectedPss, filterDateFrom, filterDateTo]);

  const hasActiveFilters = filterChips.length > 0;

  const clearFilters = () => {
    setFilterDateFrom('');
    setFilterDateTo('');
    setSelectedPss([]);
    setSelectedClients([]);
  };

  const openReplyHistory = (queryId: number) => {
    router.push(`/queries/reply-history?id=${queryId}`);
  };

  if (!user) {
    return (
      <Layout>
        <p>Please sign in to view tickets.</p>
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
      <div className="space-y-3">
        <QueryTabs active="REPLIES" />

        <div className="rounded-xl border border-slate-200/80 bg-gradient-to-br from-white to-slate-50/80 p-4 shadow-sm ring-1 ring-slate-900/5">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
            <MultiSelectDropdown
              id="filterClient"
              label="Client"
              options={uniqueClients}
              selected={selectedClients}
              onChange={setSelectedClients}
              placeholder="All clients"
            />
            <MultiSelectDropdown
              id="filterPss"
              label="PSS"
              options={uniquePssNames}
              selected={selectedPss}
              onChange={setSelectedPss}
              placeholder="All PSS"
            />
            <div>
              <label htmlFor="filterDateFrom" className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                Reply From
              </label>
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                  <CalendarIcon />
                </span>
                <input
                  id="filterDateFrom"
                  type="date"
                  value={filterDateFrom}
                  onChange={(e) => setFilterDateFrom(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-2 text-sm text-slate-800 shadow-sm transition focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                />
              </div>
            </div>
            <div>
              <label htmlFor="filterDateTo" className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                Reply To
              </label>
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                  <CalendarIcon />
                </span>
                <input
                  id="filterDateTo"
                  type="date"
                  value={filterDateTo}
                  onChange={(e) => setFilterDateTo(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-2 text-sm text-slate-800 shadow-sm transition focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                />
              </div>
            </div>
          </div>

          <div
            className="grid transition-[grid-template-rows] duration-300 ease-out"
            style={{ gridTemplateRows: filterChips.length > 0 ? '1fr' : '0fr' }}
          >
            <div className="overflow-hidden">
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                {filterChips.map((chip) => (
                  <span
                    key={chip.key}
                    className="inline-flex items-center gap-1 rounded-md border border-teal-200/80 bg-teal-50 px-2 py-0.5 text-[11px] font-medium text-teal-800"
                  >
                    {chip.label}
                    <button
                      type="button"
                      onClick={chip.onRemove}
                      className="rounded p-0.5 text-teal-600 transition hover:bg-teal-200/60 hover:text-teal-900"
                      aria-label={`Remove ${chip.label} filter`}
                    >
                      <svg className="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </span>
                ))}
                {hasActiveFilters && (
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="ml-1 text-[11px] font-medium text-slate-500 transition hover:text-red-600"
                  >
                    Clear all
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 px-1">
          <span className="inline-flex items-center rounded-full bg-slate-800 px-3 py-1 text-xs font-semibold text-white">
            {loading ? '…' : rows.length} {rows.length === 1 ? 'Result' : 'Results'}
          </span>
        </div>

        <div className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-sm ring-1 ring-slate-900/5">
          {error && (
            <p className="border-b border-slate-100 bg-red-50 px-4 py-2 text-sm text-red-700">
              {error}
            </p>
          )}
          {loading ? (
            <div className="px-4 py-12 text-center text-sm text-slate-500">Loading tickets…</div>
          ) : rows.length === 0 && !error ? (
            <EmptyState hasFilters={hasActiveFilters} scope={scope} />
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-100 text-sm">
                <thead className="bg-[#0f766e]">
                  <tr>
                    <th className="whitespace-nowrap px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-white">
                      S.No.
                    </th>
                    <th className="whitespace-nowrap px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-white">
                      PSS Name
                    </th>
                    <th className="whitespace-nowrap px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-white">
                      Client Name
                    </th>
                    <th className="whitespace-nowrap px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-white">
                      Generated By
                    </th>
                    <th className="whitespace-nowrap px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-white">
                      Replied By
                    </th>
                    <th className="whitespace-nowrap px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-white">
                      Generated Time
                    </th>
                    <th className="whitespace-nowrap px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-white">
                      Reply Time
                    </th>
                    <th className="whitespace-nowrap px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-white">
                      Solve Time
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {rows.map(({ meta }, index) => {
                    const generatedAt = getGeneratedAt(meta);
                    const solveTime =
                      meta.replied_at && generatedAt
                        ? formatSolveDuration(generatedAt, meta.replied_at)
                        : '—';
                    return (
                      <tr
                        key={meta.query_id}
                        className="group cursor-pointer border-l-[3px] border-l-transparent transition-all hover:border-l-teal-600 hover:bg-teal-50/40"
                        onClick={() => openReplyHistory(meta.query_id)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            openReplyHistory(meta.query_id);
                          }
                        }}
                        tabIndex={0}
                        role="button"
                      >
                        <td className="whitespace-nowrap px-3 py-2.5 text-slate-500">{index + 1}</td>
                        <td className="max-w-[160px] truncate px-3 py-2.5 text-slate-800" title={meta.pss_text}>
                          {cell(meta.pss_text)}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2.5 font-medium text-slate-800">
                          {cell(meta.client_name)}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2.5 text-slate-700">{cell(meta.raised_by)}</td>
                        <td className="whitespace-nowrap px-3 py-2.5 text-slate-700">{cell(meta.replied_by)}</td>
                        <td className="whitespace-nowrap px-3 py-2.5 text-xs text-slate-600">
                          {formatDateTime(generatedAt)}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2.5 text-xs text-slate-600">
                          {formatDateTime(meta.replied_at)}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2.5 text-xs">
                          <span
                            className={
                              meta.replied_at && generatedAt
                                ? solveDurationClass(generatedAt, meta.replied_at)
                                : 'text-slate-500'
                            }
                            title={
                              generatedAt && meta.replied_at
                                ? `Ticket entered → reply sent (${solveTime})`
                                : meta.replied_at
                                  ? undefined
                                  : 'Awaiting first reply'
                            }
                          >
                            {solveTime}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default RepliesInboxPage;
