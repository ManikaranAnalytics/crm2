import React, { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import Layout from '../components/Layout';
import { useAuth } from './_app';

// Dynamically import Highcharts component to prevent SSR "window is not defined" issues
const DashboardChart = dynamic(() => import('../components/DashboardChart'), {
  ssr: false,
  loading: () => (
    <div className="h-48 w-full flex items-center justify-center bg-slate-50/50 rounded-lg">
      <div className="text-xs text-slate-400">Loading interactive chart...</div>
    </div>
  ),
});

interface DashboardSummary {
  totalQueries: number;
  openQueries: number;
  inProgressQueries: number;
  assignedQueries: number;
  queriesThisMonth: number;
}

interface QueryAnalyticsPoint {
  label: string;
  value: number;
}

interface StateQuarterlyPoint {
  state: string;
  quarter: string;
  value: number;
}

// Custom Premium Icons for Metrics Cards
const IconTotal = () => (
  <svg className="w-5 h-5 text-teal-600" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
    <ellipse cx="12" cy="5" rx="9" ry="3"></ellipse>
    <path d="M3 5V19A9 3 0 0 0 21 19V5"></path>
    <path d="M3 12A9 3 0 0 0 21 12"></path>
  </svg>
);

const IconOpen = () => (
  <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
    <circle cx="12" cy="12" r="10"></circle>
    <line x1="12" y1="8" x2="12" y2="12"></line>
    <line x1="12" y1="16" x2="12.01" y2="16"></line>
  </svg>
);

const IconProgress = () => (
  <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
    <circle cx="12" cy="12" r="10"></circle>
    <polyline points="12 6 12 12 16 14"></polyline>
  </svg>
);

const IconAssign = () => (
  <svg className="w-5 h-5 text-sky-600" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
    <circle cx="9" cy="7" r="4"></circle>
    <path d="M22 21v-2a4 4 0 0 0-3-3.87"></path>
    <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
  </svg>
);

const IconMonth = () => (
  <svg className="w-5 h-5 text-rose-600" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
    <line x1="16" y1="2" x2="16" y2="6"></line>
    <line x1="8" y1="2" x2="8" y2="6"></line>
    <line x1="3" y1="10" x2="21" y2="10"></line>
  </svg>
);

const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [byStatus, setByStatus] = useState<QueryAnalyticsPoint[]>([]);
  const [byTechnology, setByTechnology] = useState<QueryAnalyticsPoint[]>([]);
  const [byMonth, setByMonth] = useState<QueryAnalyticsPoint[]>([]);
  const [byDate, setByDate] = useState<QueryAnalyticsPoint[]>([]);
  const [byUser, setByUser] = useState<QueryAnalyticsPoint[]>([]);
  const [byStateQuarterly, setByStateQuarterly] = useState<StateQuarterlyPoint[]>([]);
  const [byState, setByState] = useState<QueryAnalyticsPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const scope = 'ALL' as const;

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        params.set('scope', 'all');
        const qs = params.toString();
        const suffix = qs ? `?${qs}` : '';
        const [summaryRes, analyticsRes] = await Promise.all([
          fetch(`/api/dashboard/summary${suffix}`),
          fetch(`/api/analytics/queries${suffix}`),
        ]);

        if (!summaryRes.ok) {
          const body = await summaryRes.json().catch(() => ({}));
          throw new Error(body.error || 'Failed to load dashboard summary');
        }
        if (!analyticsRes.ok) {
          const body = await analyticsRes.json().catch(() => ({}));
          throw new Error(body.error || 'Failed to load analytics');
        }

        const summaryData: DashboardSummary = await summaryRes.json();
        const analyticsData: {
          byStatus: QueryAnalyticsPoint[];
          byTechnology: QueryAnalyticsPoint[];
          byMonth: QueryAnalyticsPoint[];
          byDate: QueryAnalyticsPoint[];
          byUser: QueryAnalyticsPoint[];
          byStateQuarterly: StateQuarterlyPoint[];
          byState: QueryAnalyticsPoint[];
        } = await analyticsRes.json();

        setSummary(summaryData);
        setByStatus(analyticsData.byStatus || []);
        setByTechnology(analyticsData.byTechnology || []);
        setByMonth(analyticsData.byMonth || []);
        setByDate(analyticsData.byDate || []);
        setByUser(analyticsData.byUser || []);
        setByStateQuarterly(analyticsData.byStateQuarterly || []);
        setByState(analyticsData.byState || []);
      } catch (err: any) {
        setError(err.message || 'Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [scope, user]);

  return (
    <Layout>
      <div className="space-y-8 text-left">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-500 font-semibold">Active Filter:</span>
            <button
              type="button"
              className="rounded-full border border-teal-600 bg-teal-55 bg-teal-50 px-3 py-1.5 font-semibold text-teal-700 shadow-sm flex items-center gap-1.5 hover:bg-teal-100 transition-colors"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-teal-500 animate-pulse"></span>
              All Users & Regions
            </button>
          </div>
        </div>

        {error && (
          <p className="rounded-md border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
            {error}
          </p>
        )}

        {/* METRICS CARDS PANEL */}
        <div className="grid gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-5">
          {/* Card 1 */}
          <div className="relative group overflow-hidden bg-white border border-slate-200/80 rounded-xl p-5 shadow-[0_1px_2px_rgba(0,0,0,0.015)] hover:-translate-y-0.5 transition-all duration-200">
            <div className="absolute top-0 left-0 w-full h-[3px] bg-teal-500"></div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Queries</span>
              <div className="h-8 w-8 rounded-full bg-teal-50 flex items-center justify-center group-hover:bg-teal-100 transition-colors">
                <IconTotal />
              </div>
            </div>
            <p className="mt-4 text-3xl font-extrabold text-slate-800 tracking-tight">
              {summary ? summary.totalQueries : loading ? '—' : 0}
            </p>
            <p className="text-[10px] text-slate-400 mt-2">Overall database volume</p>
          </div>

          {/* Card 2 */}
          <div className="relative group overflow-hidden bg-white border border-slate-200/80 rounded-xl p-5 shadow-[0_1px_2px_rgba(0,0,0,0.015)] hover:-translate-y-0.5 transition-all duration-200">
            <div className="absolute top-0 left-0 w-full h-[3px] bg-indigo-500"></div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Open Queries</span>
              <div className="h-8 w-8 rounded-full bg-indigo-50 flex items-center justify-center group-hover:bg-indigo-100 transition-colors">
                <IconOpen />
              </div>
            </div>
            <p className="mt-4 text-3xl font-extrabold text-slate-800 tracking-tight">
              {summary ? summary.openQueries : loading ? '—' : 0}
            </p>
            <p className="text-[10px] text-slate-400 mt-2">Awaiting initial action</p>
          </div>

          {/* Card 3 */}
          <div className="relative group overflow-hidden bg-white border border-slate-200/80 rounded-xl p-5 shadow-[0_1px_2px_rgba(0,0,0,0.015)] hover:-translate-y-0.5 transition-all duration-200">
            <div className="absolute top-0 left-0 w-full h-[3px] bg-emerald-500"></div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">In Progress</span>
              <div className="h-8 w-8 rounded-full bg-emerald-50 flex items-center justify-center group-hover:bg-emerald-100 transition-colors">
                <IconProgress />
              </div>
            </div>
            <p className="mt-4 text-3xl font-extrabold text-slate-800 tracking-tight">
              {summary ? summary.inProgressQueries : loading ? '—' : 0}
            </p>
            <p className="text-[10px] text-slate-400 mt-2">Currently being resolved</p>
          </div>

          {/* Card 4 */}
          <div className="relative group overflow-hidden bg-white border border-slate-200/80 rounded-xl p-5 shadow-[0_1px_2px_rgba(0,0,0,0.015)] hover:-translate-y-0.5 transition-all duration-200">
            <div className="absolute top-0 left-0 w-full h-[3px] bg-sky-500"></div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Active Queue</span>
              <div className="h-8 w-8 rounded-full bg-sky-50 flex items-center justify-center group-hover:bg-sky-100 transition-colors">
                <IconAssign />
              </div>
            </div>
            <p className="mt-4 text-3xl font-extrabold text-slate-800 tracking-tight">
              {summary ? summary.assignedQueries : loading ? '—' : 0}
            </p>
            <p className="text-[10px] text-slate-400 mt-2">Assigned to resolver team</p>
          </div>

          {/* Card 5 */}
          <div className="relative group overflow-hidden bg-white border border-slate-200/80 rounded-xl p-5 shadow-[0_1px_2px_rgba(0,0,0,0.015)] hover:-translate-y-0.5 transition-all duration-200">
            <div className="absolute top-0 left-0 w-full h-[3px] bg-rose-500"></div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">This Month</span>
              <div className="h-8 w-8 rounded-full bg-rose-50 flex items-center justify-center group-hover:bg-rose-100 transition-colors">
                <IconMonth />
              </div>
            </div>
            <p className="mt-4 text-3xl font-extrabold text-slate-800 tracking-tight">
              {summary ? summary.queriesThisMonth : loading ? '—' : 0}
            </p>
            <p className="text-[10px] text-slate-400 mt-2">New volume in current cycle</p>
          </div>
        </div>

        {/* CHARTS CONTAINER - SECTION 1 */}
        <section className="grid gap-6 md:grid-cols-2">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.02)] hover:shadow-[0_2px_8px_rgba(0,0,0,0.03)] transition-shadow duration-200">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide">Queries by status</h3>
              <p className="mt-0.5 text-xs text-slate-400">Operational query breakdown by status type.</p>
            </div>
            <div className="mt-6">
              {byStatus.length === 0 && !loading ? (
                <p className="text-sm text-slate-500 italic">No query data yet.</p>
              ) : (
                <DashboardChart
                  type="column"
                  categories={byStatus.map((d) => d.label)}
                  seriesData={byStatus.map((d) => d.value)}
                  seriesName="Queries"
                  colors={['#0f766e']}
                />
              )}
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.02)] hover:shadow-[0_2px_8px_rgba(0,0,0,0.03)] transition-shadow duration-200">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide">Queries by technology</h3>
              <p className="mt-0.5 text-xs text-slate-400">Distribution of queries across energy technologies.</p>
            </div>
            <div className="mt-6">
              {byTechnology.length === 0 && !loading ? (
                <p className="text-sm text-slate-500 italic">No query data yet.</p>
              ) : (
                <DashboardChart
                  type="column"
                  categories={byTechnology.map((d) => d.label)}
                  seriesData={byTechnology.map((d) => d.value)}
                  seriesName="Queries"
                  colors={['#4f46e5']}
                />
              )}
            </div>
          </div>
        </section>

        {/* CHARTS CONTAINER - SECTION 2 */}
        <section className="grid gap-6 md:grid-cols-2">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.02)] hover:shadow-[0_2px_8px_rgba(0,0,0,0.03)] transition-shadow duration-200">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide">Technical queries (month-wise)</h3>
              <p className="mt-0.5 text-xs text-slate-400">Monthly query trend aggregate volumes.</p>
            </div>
            <div className="mt-6">
              {byMonth.length === 0 && !loading ? (
                <p className="text-sm text-slate-500 italic">No query data yet.</p>
              ) : (
                <DashboardChart
                  type="column"
                  categories={byMonth.map((d) => d.label)}
                  seriesData={byMonth.map((d) => d.value)}
                  seriesName="Queries"
                  colors={['#10b981']}
                />
              )}
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.02)] hover:shadow-[0_2px_8px_rgba(0,0,0,0.03)] transition-shadow duration-200">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide">Date-wise technical queries</h3>
              <p className="mt-0.5 text-xs text-slate-400">Daily frequency trend of incoming queries.</p>
            </div>
            <div className="mt-6">
              {byDate.length === 0 && !loading ? (
                <p className="text-sm text-slate-500 italic">No recent query data.</p>
              ) : (
                <DashboardChart
                  type="area"
                  categories={byDate.map((d) => d.label)}
                  seriesData={byDate.map((d) => d.value)}
                  seriesName="Queries"
                  colors={['#0f766e']}
                />
              )}
            </div>
          </div>
        </section>

        {/* CHARTS CONTAINER - SECTION 3 */}
        <section className="grid gap-6 md:grid-cols-2">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.02)] hover:shadow-[0_2px_8px_rgba(0,0,0,0.03)] transition-shadow duration-200">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide">Team workload (assignee-wise)</h3>
              <p className="mt-0.5 text-xs text-slate-400">Active assigned query distribution among team members.</p>
            </div>
            <div className="mt-6">
              {byUser.length === 0 && !loading ? (
                <p className="text-sm text-slate-500 italic">No query data yet.</p>
              ) : (
                <DashboardChart
                  type="column"
                  categories={byUser.map((d) => d.label)}
                  seriesData={byUser.map((d) => d.value)}
                  seriesName="Queries"
                  colors={['#0ea5e9']}
                />
              )}
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.02)] hover:shadow-[0_2px_8px_rgba(0,0,0,0.03)] transition-shadow duration-200">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide">State-wise query analysis</h3>
              <p className="mt-0.5 text-xs text-slate-400">Geographic distribution of raised queries.</p>
            </div>
            <div className="mt-6">
              {byState.length === 0 && !loading ? (
                <p className="text-sm text-slate-500 italic">No query data yet.</p>
              ) : (
                <DashboardChart
                  type="column"
                  categories={byState.map((d) => d.label)}
                  seriesData={byState.map((d) => d.value)}
                  seriesName="Queries"
                  colors={['#8b5cf6']}
                />
              )}
            </div>
          </div>
        </section>

        {/* CHARTS CONTAINER - SECTION 4 */}
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.02)] hover:shadow-[0_2px_8px_rgba(0,0,0,0.03)] transition-shadow duration-200">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide">
              State-wise queries (quarterly comparison)
            </h3>
            <p className="mt-0.5 text-xs text-slate-400">
              Granular quarterly state-wise comparison of query volumes.
            </p>
          </div>
          <div className="mt-6">
            {byStateQuarterly.length === 0 && !loading ? (
              <p className="text-sm text-slate-500 italic">No query data yet.</p>
            ) : (
              <DashboardChart
                type="column"
                categories={byStateQuarterly.map((p) => `${p.state} - ${p.quarter}`)}
                seriesData={byStateQuarterly.map((p) => p.value)}
                seriesName="Queries"
                colors={['#ec4899']}
              />
            )}
          </div>
        </section>
      </div>
    </Layout>
  );
};

export default DashboardPage;
