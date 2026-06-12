import type { NextApiRequest, NextApiResponse } from 'next';
import { query } from '../../../lib/db';
import type { RoleName } from '../../../lib/auth/roles';

interface RoleRecord {
  id: number;
  name: RoleName;
}

interface RoleResponse {
  id: number;
  name: RoleName;
}

function mapRole(row: RoleRecord): RoleResponse {
  return {
    id: row.id,
    name: row.name,
  };
}

import { getSessionUser } from '../../../lib/auth/session';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const user = await getSessionUser(req);
  if (!user || user.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Forbidden' });
  }

  if (req.method === 'GET') {
    const result = await query<RoleRecord>('SELECT id, name FROM roles ORDER BY id');

    return res.status(200).json({ roles: result.rows.map(mapRole) });
  }

  if (req.method === 'POST') {
    const { name } = req.body || {};

    if (!name) {
      return res.status(400).json({ error: 'Role name is required' });
    }

    try {
      const result = await query<RoleRecord>(
        `INSERT INTO roles (name)
         VALUES ($1)
         RETURNING id, name`,
        [name],
      );

      return res.status(201).json({ role: mapRole(result.rows[0]) });
    } catch (err: any) {
      return res.status(400).json({ error: err.message || 'Failed to create role' });
    }
  }

  if (req.method === 'DELETE') {
    const { id } = req.query;
    const roleId = Number(id);
    if (!roleId || Number.isNaN(roleId)) {
      return res.status(400).json({ error: 'Valid id query parameter is required' });
    }

    try {
      await query('DELETE FROM roles WHERE id = $1', [roleId]);
      return res.status(204).end();
    } catch (err: any) {
      return res.status(400).json({ error: err.message || 'Failed to delete role' });
    }
  }

  res.setHeader('Allow', ['GET', 'POST', 'DELETE']);
  return res.status(405).end('Method Not Allowed');
}

