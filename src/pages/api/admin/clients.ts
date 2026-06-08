import type { NextApiRequest, NextApiResponse } from 'next';
import { query } from '../../../lib/db';

interface ClientRow {
  id: number;
  name: string;
  state: string | null;
  is_approved: boolean;
  pss_count?: number;
}

interface ClientResponse {
  id: number;
  name: string;
  state: string | null;
  isApproved: boolean;
  pssCount: number;
}

function mapClient(row: ClientRow): ClientResponse {
  return {
    id: row.id,
    name: row.name,
    state: row.state,
    isApproved: row.is_approved,
    pssCount: row.pss_count ?? 0,
  };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    const result = await query<ClientRow>(
      `SELECT c.id,
              c.name,
              c.state,
              c.is_approved,
              COUNT(p.id)::int AS pss_count
         FROM clients c
         LEFT JOIN client_pss p ON p.client_id = c.id
        GROUP BY c.id
        ORDER BY c.id`,
    );

    return res.status(200).json({ clients: result.rows.map(mapClient) });
  }

  if (req.method === 'POST') {
    const { name, state, isApproved } = req.body || {};

    if (!name) {
      return res.status(400).json({ error: 'name is required' });
    }

    try {
      const insert = await query<ClientRow>(
        `INSERT INTO clients (name, state, is_approved)
         VALUES ($1, $2, $3)
         RETURNING id, name, state, is_approved`,
        [name, state ?? null, !!isApproved],
      );

      const row = insert.rows[0];
      (row as any).pss_count = 0;
      return res.status(201).json({ client: mapClient(row) });
    } catch (err: any) {
      return res.status(400).json({ error: err.message || 'Failed to create client' });
    }
  }

	  if (req.method === 'PATCH') {
	    const { id, name, state, isApproved } = req.body || {};
	    const clientId = Number(id);
	
	    if (!clientId || Number.isNaN(clientId)) {
	      return res.status(400).json({ error: 'Valid id is required' });
	    }
	
	    const updates: string[] = [];
	    const params: any[] = [];
	    let idx = 1;
	
	    if (typeof name === 'string' && name.trim()) {
	      updates.push(`name = $${idx++}`);
	      params.push(name.trim());
	    }
	
	    if (state !== undefined) {
	      updates.push(`state = $${idx++}`);
	      params.push(state || null);
	    }
	
	    if (typeof isApproved === 'boolean') {
	      updates.push(`is_approved = $${idx++}`);
	      params.push(isApproved);
	    }
	
	    if (!updates.length) {
	      return res.status(400).json({ error: 'No valid fields to update' });
	    }
	
	    params.push(clientId);
	
	    try {
	      const updated = await query<ClientRow>(
	        `UPDATE clients
	            SET ${updates.join(', ')}
	          WHERE id = $${idx}
	          RETURNING id, name, state, is_approved`,
	        params,
	      );
	
	      if (!updated.rows[0]) {
	        return res.status(404).json({ error: 'Client not found' });
	      }
	
	      const countRes = await query<{ pss_count: number }>(
	        'SELECT COUNT(*)::int AS pss_count FROM client_pss WHERE client_id = $1',
	        [clientId],
	      );
	
	      const row = updated.rows[0];
	      (row as any).pss_count = countRes.rows[0]?.pss_count ?? 0;
	      return res.status(200).json({ client: mapClient(row as any) });
	    } catch (err: any) {
	      return res.status(400).json({ error: err.message || 'Failed to update client' });
	    }
	  }

  if (req.method === 'DELETE') {
    const { id } = req.query;
    const clientId = Number(id);

    if (!clientId || Number.isNaN(clientId)) {
      return res.status(400).json({ error: 'Valid id query parameter is required' });
    }

    try {
      await query('DELETE FROM clients WHERE id = $1', [clientId]);
      return res.status(204).end();
    } catch (err: any) {
      return res.status(400).json({ error: err.message || 'Failed to delete client' });
    }
  }

  res.setHeader('Allow', ['GET', 'POST', 'PATCH', 'DELETE']);
  return res.status(405).end('Method Not Allowed');
}

