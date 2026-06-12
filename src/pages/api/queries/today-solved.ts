import type { NextApiRequest, NextApiResponse } from 'next';
import { getSessionUser } from '../../../lib/auth/session';
import { query } from '../../../lib/db';

function getQueryParam(req: NextApiRequest, key: string): string | undefined {
  const raw = req.query[key];
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (value == null || String(value).trim() === '') return undefined;
  return String(value).trim();
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end('Method Not Allowed');
  }

  const user = await getSessionUser(req);
  if (!user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  try {
    const dateGeneratedFrom = getQueryParam(req, 'dateGeneratedFrom');
    const dateGeneratedTo = getQueryParam(req, 'dateGeneratedTo');
    const dateAssignedFrom = getQueryParam(req, 'dateAssignedFrom');
    const dateAssignedTo = getQueryParam(req, 'dateAssignedTo');
    const dateSolvedFrom = getQueryParam(req, 'dateSolvedFrom');
    const dateSolvedTo = getQueryParam(req, 'dateSolvedTo');
    const generatedBy = getQueryParam(req, 'generatedBy');
    const assignedTo = getQueryParam(req, 'assignedTo');
    const solvedBy = getQueryParam(req, 'solvedBy');

    const conditions: string[] = [`q.current_status = 'CLOSED'`];
    const params: (string | number)[] = [];
    let paramIndex = 1;

    if (dateGeneratedFrom) {
      conditions.push(`q.query_entry_date::date >= $${paramIndex}::date`);
      params.push(dateGeneratedFrom);
      paramIndex += 1;
    }
    if (dateGeneratedTo) {
      conditions.push(`q.query_entry_date::date <= $${paramIndex}::date`);
      params.push(dateGeneratedTo);
      paramIndex += 1;
    }
    if (dateAssignedFrom) {
      conditions.push(`q.query_raised_date::date >= $${paramIndex}::date`);
      params.push(dateAssignedFrom);
      paramIndex += 1;
    }
    if (dateAssignedTo) {
      conditions.push(`q.query_raised_date::date <= $${paramIndex}::date`);
      params.push(dateAssignedTo);
      paramIndex += 1;
    }
    if (dateSolvedFrom) {
      conditions.push(`COALESCE(q.closed_date, q.updated_at)::date >= $${paramIndex}::date`);
      params.push(dateSolvedFrom);
      paramIndex += 1;
    }
    if (dateSolvedTo) {
      conditions.push(`COALESCE(q.closed_date, q.updated_at)::date <= $${paramIndex}::date`);
      params.push(dateSolvedTo);
      paramIndex += 1;
    }
    if (generatedBy) {
      conditions.push(`q.raised_by = $${paramIndex}`);
      params.push(generatedBy);
      paramIndex += 1;
    }
    if (assignedTo) {
      conditions.push(`q.responsibility_to = $${paramIndex}`);
      params.push(assignedTo);
      paramIndex += 1;
    }
    if (solvedBy) {
      conditions.push(`COALESCE(solver.name, q.responsibility_to) = $${paramIndex}`);
      params.push(solvedBy);
      paramIndex += 1;
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const result = await query<{
      id: number;
      query_code: string;
      client_name: string | null;
      state: string | null;
      raised_by: string | null;
      responsibility_to: string | null;
      query_entry_date: string | null;
      query_raised_date: string | null;
      closed_date: string | null;
      solved_by: string | null;
      updated_at: string;
    }>(
      `SELECT
         q.id,
         q.query_code,
         c.name AS client_name,
         q.state,
         q.raised_by,
         q.responsibility_to,
         q.query_entry_date,
         q.query_raised_date,
         q.closed_date,
         COALESCE(solver.name, q.responsibility_to) AS solved_by,
         q.updated_at
       FROM queries q
       LEFT JOIN clients c ON q.client_id = c.id
       LEFT JOIN LATERAL (
         SELECT u.name
         FROM query_replies r
         JOIN users u ON u.id = r.author_id
         WHERE r.query_id = q.id
         ORDER BY r.created_at DESC
         LIMIT 1
       ) solver ON TRUE
       ${whereClause}
       ORDER BY q.closed_date DESC NULLS LAST, q.updated_at DESC
       LIMIT 500`,
      params,
    );

    const queries = result.rows.map((row) => ({
      id: row.id,
      queryCode: row.query_code,
      clientName: row.client_name ?? undefined,
      state: row.state ?? undefined,
      generatedBy: row.raised_by ?? undefined,
      assignedTo: row.responsibility_to ?? undefined,
      solvedBy: row.solved_by ?? undefined,
      queryEntryDate: row.query_entry_date ?? undefined,
      queryAssignDate: row.query_raised_date ?? undefined,
      resolvedAt: row.closed_date ?? row.updated_at,
    }));

    return res.status(200).json({ queries });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to load solved queries';
    return res.status(500).json({ error: message });
  }
}
