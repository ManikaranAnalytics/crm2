import type { NextApiResponse } from 'next';
import jwt from 'jsonwebtoken';
import type { ApiRequestWithUser } from '../../../lib/auth/session';
import { query } from '../../../lib/db';
import type { RoleName } from '../../../lib/auth/roles';
import { isDevAuthEnabled } from '../../../lib/auth/devOnly';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_development_secret_do_not_use_in_production';

export default async function handler(req: ApiRequestWithUser, res: NextApiResponse) {
  if (!isDevAuthEnabled()) {
    return res.status(404).json({ error: 'Not found' });
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end('Method Not Allowed');
  }

  const userId = Number(req.body?.userId);
  if (!userId || Number.isNaN(userId)) {
    return res.status(400).json({ error: 'userId is required' });
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
        WHERE u.id = $1 AND u.is_active = TRUE`,
      [userId],
    );

    const row = result.rows[0];
    if (!row) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = {
      id: row.id,
      email: row.email,
      name: row.name,
      role: row.role_name,
      rank: row.rank,
    };

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '24h' },
    );

    res.setHeader(
      'Set-Cookie',
      `crm_session_token=${token}; Path=/; Max-Age=86400; HttpOnly; SameSite=Lax`,
    );

    return res.status(200).json({ user });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Dev login failed';
    return res.status(500).json({ error: message });
  }
}
