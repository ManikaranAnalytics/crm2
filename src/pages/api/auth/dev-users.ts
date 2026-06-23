import type { NextApiRequest, NextApiResponse } from 'next';
import { query } from '../../../lib/db';
import type { RoleName } from '../../../lib/auth/roles';

import { isDevAuthEnabled } from '../../../lib/auth/devOnly';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!isDevAuthEnabled()) {
    return res.status(404).json({ error: 'Not found' });
  }

  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end('Method Not Allowed');
  }

  try {
    const result = await query<{
      id: number;
      email: string;
      name: string;
      rank: number;
      role_name: RoleName;
    }>(
      `SELECT u.id, u.email, u.name, u.rank, r.name AS role_name
         FROM users u
         JOIN roles r ON r.id = u.role_id
        WHERE u.is_active = TRUE
        ORDER BY r.name, u.name`,
    );

    const users = result.rows.map((row) => ({
      id: row.id,
      email: row.email,
      name: row.name,
      role: row.role_name,
      rank: row.rank,
    }));

    return res.status(200).json({ users });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to load users';
    return res.status(500).json({ error: message });
  }
}
