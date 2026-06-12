import type { NextApiRequest, NextApiResponse } from 'next';
import { query } from '../../../lib/db';

interface DashboardSummary {
  totalQueries: number;
  openQueries: number;
  inProgressQueries: number;
  assignedQueries: number;
  queriesThisMonth: number;
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

    const result = await query<{
      total_queries: number;
      open_queries: number;
      in_progress_queries: number;
      assigned_queries: number;
      queries_this_month: number;
    }>(
      `SELECT
         (SELECT COUNT(*)::int FROM queries ${userWhere}) AS total_queries,
         (SELECT COUNT(*)::int FROM queries WHERE current_status = 'OPEN' ${userAnd}) AS open_queries,
         (SELECT COUNT(*)::int FROM queries WHERE current_status = 'IN_PROGRESS' ${userAnd}) AS in_progress_queries,
         (SELECT COUNT(*)::int
            FROM queries
           WHERE responsibility_to_id IS NOT NULL
             AND current_status <> 'CLOSED'
             ${userAnd}) AS assigned_queries,
         (SELECT COUNT(*)::int
            FROM queries
           WHERE COALESCE(query_entry_date, created_at) >= date_trunc('month', CURRENT_DATE)
             AND COALESCE(query_entry_date, created_at) < (date_trunc('month', CURRENT_DATE) + INTERVAL '1 month')
             ${userAnd}) AS queries_this_month`,
      params,
    );

    const row = result.rows[0] || {
      total_queries: 0,
      open_queries: 0,
      in_progress_queries: 0,
      assigned_queries: 0,
      queries_this_month: 0,
    };

    const summary: DashboardSummary = {
      totalQueries: row.total_queries ?? 0,
      openQueries: row.open_queries ?? 0,
      inProgressQueries: row.in_progress_queries ?? 0,
      assignedQueries: row.assigned_queries ?? 0,
      queriesThisMonth: row.queries_this_month ?? 0,
    };

    return res.status(200).json(summary);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to load dashboard summary';
    return res.status(500).json({ error: message });
  }
}
