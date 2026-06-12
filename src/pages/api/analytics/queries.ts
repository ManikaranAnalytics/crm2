import type { NextApiRequest, NextApiResponse } from 'next';
import { query } from '../../../lib/db';

export interface QueryAnalyticsPoint {
  label: string;
  value: number;
}

export interface StateQuarterlyPoint {
  state: string;
  quarter: string;
  value: number;
}

	export default async function handler(req: NextApiRequest, res: NextApiResponse) {
	  try {
	    const scopeParam = Array.isArray(req.query.scope) ? req.query.scope[0] : req.query.scope;
	    const userIdParam = Array.isArray(req.query.userId) ? req.query.userId[0] : req.query.userId;
	    const scope = scopeParam === 'user' ? 'user' : 'all';
	    const userId = userIdParam ? Number(userIdParam) : NaN;
	    const hasUserFilter = scope === 'user' && !Number.isNaN(userId) && userId > 0;
	    const userWhere = hasUserFilter ? 'WHERE responsibility_to_id = $1' : '';
	    const userAnd = hasUserFilter ? 'AND responsibility_to_id = $1' : '';
	    const params = hasUserFilter ? [userId] : [];

	    // Status breakdown (for "Queries by status")
	    const byStatusResult = await query<QueryAnalyticsPoint>(
	      `SELECT current_status::text AS label, COUNT(*)::int AS value
	         FROM queries
	        ${userWhere}
	        GROUP BY current_status
	        ORDER BY current_status`,
	      params,
	    );

	    // Technology breakdown (for "Queries by technology")
	    const byTechnologyResult = await query<QueryAnalyticsPoint>(
	      `SELECT COALESCE(technology::text, 'UNKNOWN') AS label,
	              COUNT(*)::int AS value
	         FROM queries
	        ${userWhere}
	        GROUP BY COALESCE(technology::text, 'UNKNOWN')
	        ORDER BY label`,
	      params,
	    );

	    // 1) Technical Queries (month-wise)
	    const byMonthResult = await query<QueryAnalyticsPoint>(
	      `SELECT to_char(date_trunc('month', COALESCE(query_entry_date, created_at)), 'YYYY-MM') AS label,
	              COUNT(*)::int AS value
	         FROM queries
	        WHERE COALESCE(query_entry_date, created_at) IS NOT NULL
	          ${userAnd}
	        GROUP BY to_char(date_trunc('month', COALESCE(query_entry_date, created_at)), 'YYYY-MM')
	        ORDER BY label`,
	      params,
	    );

	    // 2) Date wise Technical Query (limit to recent 90 days for readability)
	    const byDateResult = await query<QueryAnalyticsPoint>(
	      `SELECT to_char(date_trunc('day', COALESCE(query_entry_date, created_at)), 'YYYY-MM-DD') AS label,
	              COUNT(*)::int AS value
	         FROM queries
	        WHERE COALESCE(query_entry_date, created_at) >= (CURRENT_DATE - INTERVAL '90 days')
	          ${userAnd}
	        GROUP BY to_char(date_trunc('day', COALESCE(query_entry_date, created_at)), 'YYYY-MM-DD')
	        ORDER BY label`,
	      params,
	    );

	    // 3) Team workload (assignee-wise active queries)
	    const byUserResult = await query<QueryAnalyticsPoint>(
	      `SELECT COALESCE(responsibility_to, 'UNASSIGNED') AS label,
	              COUNT(*)::int AS value
	         FROM queries
	        WHERE current_status <> 'CLOSED'
	          ${userAnd}
	        GROUP BY COALESCE(responsibility_to, 'UNASSIGNED')
	        ORDER BY label`,
	      params,
	    );

	    // 4) State wise Queries Quarterly comparison
	    const byStateQuarterlyResult = await query<StateQuarterlyPoint>(
	      `SELECT COALESCE(state, 'UNKNOWN') AS state,
	              to_char(date_trunc('quarter', COALESCE(query_entry_date, created_at)), 'YYYY-"Q"Q') AS quarter,
	              COUNT(*)::int AS value
	         FROM queries
	        WHERE COALESCE(query_entry_date, created_at) IS NOT NULL
	          ${userAnd}
	        GROUP BY COALESCE(state, 'UNKNOWN'),
	                 to_char(date_trunc('quarter', COALESCE(query_entry_date, created_at)), 'YYYY-"Q"Q')
	        ORDER BY state, quarter`,
	      params,
	    );

	    // 5) State-wise Query Analysis (overall by state)
	    const byStateResult = await query<QueryAnalyticsPoint>(
	      `SELECT COALESCE(state, 'UNKNOWN') AS label,
	              COUNT(*)::int AS value
	         FROM queries
	        ${userWhere}
	        GROUP BY COALESCE(state, 'UNKNOWN')
	        ORDER BY label`,
	      params,
	    );

	    return res.status(200).json({
	      byStatus: byStatusResult.rows,
	      byTechnology: byTechnologyResult.rows,
	      byMonth: byMonthResult.rows,
	      byDate: byDateResult.rows,
	      byUser: byUserResult.rows,
	      byStateQuarterly: byStateQuarterlyResult.rows,
	      byState: byStateResult.rows,
	    });
	  } catch (err: any) {
	    return res.status(500).json({ error: err.message || 'Failed to load analytics' });
	  }
}

