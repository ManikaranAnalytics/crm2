import React, { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import { useAuth } from './_app';

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

interface SimpleBarChartProps {
	data: QueryAnalyticsPoint[];
	colorClass?: string;
	height?: number; // kept for API compatibility; SVG has fixed viewBox
}

const SimpleBarChart: React.FC<SimpleBarChartProps> = ({
	data,
	colorClass = 'bg-teal-500',
}) => {
	if (!data.length) return null;
	const max = data.reduce((m, d) => Math.max(m, d.value), 0) || 1;
	const n = data.length;

	// Map Tailwind color tokens to explicit hex so SVG bars are always visible
	const colorMap: Record<string, string> = {
		'bg-teal-500': '#14b8a6',
		'bg-indigo-500': '#6366f1',
		'bg-emerald-500': '#10b981',
		'bg-sky-500': '#0ea5e9',
		'bg-purple-500': '#a855f7',
		'bg-rose-500': '#f43f5e',
	};
	const fill = colorMap[colorClass] || '#0f766e';

		// basic bar layout inside 0–100 viewBox
		const leftMargin = 8;
		const rightMargin = 8;
		const topMargin = 8;
		const bottomMargin = 22; // room for labels under the axis
		const chartWidth = 100 - leftMargin - rightMargin;
		const chartHeight = 100 - topMargin - bottomMargin;
		const baselineY = topMargin + chartHeight;
		const gap = n > 1 ? chartWidth / (n * 3) : chartWidth / 3;
		const barWidth = n > 0 ? (chartWidth - gap * (n - 1)) / n : chartWidth;

		return (
			<div className="mt-2">
				<svg viewBox="0 0 100 100" className="h-48 w-full">
					{/* baseline */}
					<line
						x1={leftMargin}
						y1={baselineY}
						x2={leftMargin + chartWidth}
						y2={baselineY}
						stroke="#e5e7eb"
						strokeWidth={1}
					/>
					{data.map((d, idx) => {
						const valueRatio = d.value / max;
						const barHeight = Math.max(2, valueRatio * chartHeight);
						const x = leftMargin + idx * (barWidth + gap);
						const y = baselineY - barHeight;
						const centerX = x + barWidth / 2;
						return (
							<g key={`${d.label}-${idx}`}>
								<rect
									x={x}
									y={y}
									width={barWidth}
									height={barHeight}
									rx={1.5}
									fill={fill}
								/>
								{/* value above bar */}
								<text
									x={centerX}
									y={y - 2}
									fontSize={4}
									fill="#0f172a"
									textAnchor="middle"
								>
									{d.value}
								</text>
								{/* label under baseline, aligned with bar */}
								<text
									x={centerX}
									y={baselineY + 7}
									fontSize={3.5}
									fill="#64748b"
									textAnchor="middle"
								>
									{d.label}
								</text>
							</g>
					);
					})}
				</svg>
			</div>
		);
};

interface SimpleLineChartProps {
	data: QueryAnalyticsPoint[];
}

const SimpleLineChart: React.FC<SimpleLineChartProps> = ({ data }) => {
	if (!data.length) return null;
	const max = data.reduce((m, d) => Math.max(m, d.value), 0) || 1;
	const n = data.length;
	const points = data
		.map((d, idx) => {
			const x = (idx / Math.max(1, n - 1)) * 100;
			const y = 100 - (d.value / max) * 100;
			return `${x},${y}`;
		})
		.join(' ');

		return (
			<div className="mt-4">
				<svg viewBox="0 0 100 100" className="h-52 w-full">
				<polyline
					fill="none"
					stroke="#0f766e"
					strokeWidth={2}
					strokeLinejoin="round"
					strokeLinecap="round"
					points={points}
				/>
				{data.map((d, idx) => {
					const x = (idx / Math.max(1, n - 1)) * 100;
					const y = 100 - (d.value / max) * 100;
					return <circle key={d.label} cx={x} cy={y} r={1.5} fill="#0f766e" />;
				})}
			</svg>
			<div className="mt-2 flex justify-between text-[10px] text-slate-500">
				<span>{data[0]?.label}</span>
				{n > 2 && <span>{data[Math.floor(n / 2)]?.label}</span>}
				{n > 1 && <span>{data[n - 1]?.label}</span>}
			</div>
		</div>
	);
};

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
	  // const [scope, setScope] = useState<'ALL' | 'ME'>('ALL');
	  const scope = 'ALL' as const;

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
	        // if (scope === 'ME' && !user) {
	        //   setScope('ALL');
	        //   setLoading(false);
	        //   return;
	        // }

	        const params = new URLSearchParams();
	        // if (scope === 'ME' && user) {
	        //   params.set('scope', 'user');
	        //   params.set('userId', String(user.id));
	        // } else {
	          params.set('scope', 'all');
	        // }
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
      <div className="space-y-8">
	        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
	          <div>
	            <h2 className="text-2xl font-semibold text-slate-900">Dashboard</h2>
	            <p className="text-sm text-slate-500">
	              Overview of technical queries: volumes, status mix, team performance, and state-wise
	              analysis.
	            </p>
	          </div>
	          <div className="flex items-center gap-2 text-xs">
	            <span className="text-slate-500">View stats for:</span>
	            <button
	              type="button"
	              className="rounded-full border border-teal-600 bg-teal-600 px-3 py-1 font-medium text-white"
	            >
	              All users
	            </button>
	            {/*
	            <button
	              type="button"
	              disabled={!user}
	              onClick={() => user && setScope('ME')}
	              className={`rounded-full border px-3 py-1 font-medium ${
	                scope === 'ME'
	                  ? 'border-teal-600 bg-teal-600 text-white'
	                  : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
	              } ${!user ? 'cursor-not-allowed opacity-50' : ''}`}
	            >
	              My assignments
	            </button>
	            */}
	          </div>
	        </div>

        {error && (
          <p className="rounded-md border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
            {error}
          </p>
        )}

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Total Queries</p>
            <p className="mt-2 text-3xl font-semibold text-slate-900">
              {summary ? summary.totalQueries : loading ? '—' : 0}
            </p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Open Queries</p>
            <p className="mt-2 text-3xl font-semibold text-slate-900">
              {summary ? summary.openQueries : loading ? '—' : 0}
            </p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">In Progress</p>
            <p className="mt-2 text-3xl font-semibold text-slate-900">
              {summary ? summary.inProgressQueries : loading ? '—' : 0}
            </p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Active Assignments</p>
            <p className="mt-2 text-3xl font-semibold text-slate-900">
              {summary ? summary.assignedQueries : loading ? '—' : 0}
            </p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Queries This Month</p>
            <p className="mt-2 text-3xl font-semibold text-slate-900">
              {summary ? summary.queriesThisMonth : loading ? '—' : 0}
            </p>
          </div>
        </div>

	        <section className="grid gap-6 md:grid-cols-2">
	          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
	            <h3 className="text-sm font-semibold text-slate-900">Queries by status</h3>
	            <p className="mt-1 text-xs text-slate-500">
	              Data comes directly from the <code className="rounded bg-slate-100 px-1">queries</code>{' '}
	              table.
	            </p>
	            <div className="mt-4">
	              {byStatus.length === 0 && !loading && (
	                <p className="text-sm text-slate-500">No query data yet.</p>
	              )}
	              {byStatus.length > 0 && (
	                <SimpleBarChart data={byStatus} colorClass="bg-teal-500" />
	              )}
	            </div>
	          </div>
	
	          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
	            <h3 className="text-sm font-semibold text-slate-900">Queries by technology</h3>
	            <p className="mt-1 text-xs text-slate-500">
	              This will later feed into Highcharts or another charting library.
	            </p>
	            <div className="mt-4">
	              {byTechnology.length === 0 && !loading && (
	                <p className="text-sm text-slate-500">No query data yet.</p>
	              )}
	              {byTechnology.length > 0 && (
	                <SimpleBarChart data={byTechnology} colorClass="bg-indigo-500" />
	              )}
	            </div>
	          </div>
	        </section>

	        <section className="grid gap-6 md:grid-cols-2">
	          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
	            <h3 className="text-sm font-semibold text-slate-900">Technical queries (month-wise)</h3>
	            <p className="mt-1 text-xs text-slate-500">Counts of queries grouped by month.</p>
	            <div className="mt-4">
	              {byMonth.length === 0 && !loading && (
	                <p className="text-sm text-slate-500">No query data yet.</p>
	              )}
	              {byMonth.length > 0 && (
	                <SimpleBarChart data={byMonth} colorClass="bg-emerald-500" />
	              )}
	            </div>
	          </div>

	          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
	            <h3 className="text-sm font-semibold text-slate-900">Date-wise technical queries</h3>
	            <p className="mt-1 text-xs text-slate-500">
	              Daily counts for the last 90 days (suitable for a line chart later).
	            </p>
	            <div className="mt-4 max-h-64 space-y-2 overflow-y-auto text-xs">
	              {byDate.length === 0 && !loading && (
	                <p className="text-sm text-slate-500">No recent query data.</p>
	              )}
	              {byDate.length > 0 && <SimpleLineChart data={byDate} />}
	            </div>
	          </div>
	        </section>

	        <section className="grid gap-6 md:grid-cols-2">
	          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
	            <h3 className="text-sm font-semibold text-slate-900">Team workload (assignee-wise)</h3>
	            <p className="mt-1 text-xs text-slate-500">
	              Active (non-closed) queries per assignee using auto-assignment workload.
	            </p>
	            <div className="mt-4">
	              {byUser.length === 0 && !loading && (
	                <p className="text-sm text-slate-500">No query data yet.</p>
	              )}
	              {byUser.length > 0 && (
	                <SimpleBarChart data={byUser} colorClass="bg-sky-500" />
	              )}
	            </div>
	          </div>

	          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
	            <h3 className="text-sm font-semibold text-slate-900">State-wise query analysis</h3>
	            <p className="mt-1 text-xs text-slate-500">Total queries per state.</p>
	            <div className="mt-4">
	              {byState.length === 0 && !loading && (
	                <p className="text-sm text-slate-500">No query data yet.</p>
	              )}
	              {byState.length > 0 && (
	                <SimpleBarChart data={byState} colorClass="bg-purple-500" />
	              )}
	            </div>
	          </div>
	        </section>

	        <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
	          <h3 className="text-sm font-semibold text-slate-900">
	            State-wise queries (quarterly comparison)
	          </h3>
	          <p className="mt-1 text-xs text-slate-500">
	            Each row shows a state and quarter with its query count. This can later be visualised as a
	            multi-series chart.
	          </p>
	          <div className="mt-4 max-h-72 overflow-y-auto text-xs">
	            {byStateQuarterly.length === 0 && !loading && (
	              <p className="text-sm text-slate-500">No query data yet.</p>
	            )}
	            {byStateQuarterly.length > 0 && (
	              <SimpleBarChart
	                data={byStateQuarterly.map((p) => ({
	                  label: `${p.state} - ${p.quarter}`,
	                  value: p.value,
	                }))}
	                colorClass="bg-rose-500"
	                height={140}
	              />
	            )}
	          </div>
	        </section>
      </div>
    </Layout>
  );
};

export default DashboardPage;

