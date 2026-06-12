import type { NextApiRequest, NextApiResponse } from 'next';
import { query } from '../../../lib/db';
import type { RoleName } from '../../../lib/auth/roles';

interface UserRow {
  id: number;
  email: string;
  name: string;
  rank: number;
  is_active: boolean;
  role_name: RoleName;
}

interface UserResponse {
  id: number;
  email: string;
  name: string;
  rank: number;
  isActive: boolean;
  roleName: RoleName;
}

function mapUser(row: UserRow): UserResponse {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    rank: row.rank,
    isActive: row.is_active,
    roleName: row.role_name,
  };
}

import { getSessionUser } from '../../../lib/auth/session';

	export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const user = await getSessionUser(req);
  if (!user || user.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Forbidden' });
  }

	  if (req.method === 'GET') {
    const result = await query<UserRow>(
      `SELECT u.id,
              u.email,
              u.name,
              u.rank,
              u.is_active,
              r.name AS role_name
         FROM users u
         JOIN roles r ON u.role_id = r.id
        ORDER BY u.id`,
    );

    return res.status(200).json({ users: result.rows.map(mapUser) });
	  }

	  if (req.method === 'POST') {
    const { email, name, password, roleName, rank } = req.body || {};

    if (!email || !name || !password || !roleName || rank == null) {
      return res.status(400).json({ error: 'email, name, password, roleName and rank are required' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = password.trim();

    try {
      const roleResult = await query<{ id: number }>('SELECT id FROM roles WHERE name = $1', [roleName]);
      const role = roleResult.rows[0];
      if (!role) {
        return res.status(400).json({ error: 'Invalid roleName' });
      }

      // NOTE: For now we store the password as-is in password_hash. Replace with a real hash later.
      const insertResult = await query<UserRow>(
        `INSERT INTO users (email, password_hash, name, role_id, rank)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, email, name, rank, is_active,
                   (SELECT name FROM roles WHERE id = role_id) AS role_name`,
        [cleanEmail, cleanPassword, name.trim(), role.id, rank],
      );

      return res.status(201).json({ user: mapUser(insertResult.rows[0]) });
	    } catch (err: any) {
	      return res.status(400).json({ error: err.message || 'Failed to create user' });
	    }
	  }

	  if (req.method === 'PATCH') {
	    const { id, email, name, roleName, rank, isActive } = req.body || {};
	    const userId = Number(id);
	    if (!userId || Number.isNaN(userId)) {
	      return res.status(400).json({ error: 'Valid id is required' });
	    }

	    if (!email || !name || !roleName || rank == null || typeof isActive !== 'boolean') {
	      return res
	        .status(400)
	        .json({ error: 'email, name, roleName, rank and isActive are required for update' });
	    }

	    try {
	      const roleResult = await query<{ id: number }>('SELECT id FROM roles WHERE name = $1', [
	        roleName,
	      ]);
	      const role = roleResult.rows[0];
	      if (!role) {
	        return res.status(400).json({ error: 'Invalid roleName' });
	      }

	      const updated = await query<UserRow>(
	        `UPDATE users
	            SET email = $1,
	                name = $2,
	                role_id = $3,
	                rank = $4,
	                is_active = $5,
	                updated_at = now()
	          WHERE id = $6
	          RETURNING id, email, name, rank, is_active,
	                    (SELECT name FROM roles WHERE id = role_id) AS role_name`,
	        [email, name, role.id, rank, isActive, userId],
	      );

	      if (!updated.rows[0]) {
	        return res.status(404).json({ error: 'User not found' });
	      }

	      return res.status(200).json({ user: mapUser(updated.rows[0]) });
	    } catch (err: any) {
	      return res.status(400).json({ error: err.message || 'Failed to update user' });
	    }
	  }

	  if (req.method === 'DELETE') {
	    const { id } = req.query;
	    const userId = Number(id);
	    if (!userId || Number.isNaN(userId)) {
	      return res.status(400).json({ error: 'Valid id query parameter is required' });
	    }

	    try {
	      await query('DELETE FROM users WHERE id = $1', [userId]);
	      return res.status(204).end();
	    } catch (err: any) {
	      return res.status(400).json({ error: err.message || 'Failed to delete user' });
	    }
	  }

	  res.setHeader('Allow', ['GET', 'POST', 'PATCH', 'DELETE']);
	  return res.status(405).end('Method Not Allowed');
	}

