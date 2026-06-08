import type { NextApiResponse } from 'next';
import type { ApiRequestWithUser } from '../../../lib/auth/session';
import { authenticateUser } from '../../../services/authService';

export default async function handler(req: ApiRequestWithUser, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end('Method Not Allowed');
  }

  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    const user = await authenticateUser(email.trim(), password.trim());
    // TODO: set HTTP-only cookie / JWT
    return res.status(200).json({ user });
  } catch (err: any) {
    return res.status(401).json({ error: err.message || 'Invalid credentials' });
  }
}

