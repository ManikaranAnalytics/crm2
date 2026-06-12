import type { NextApiResponse } from 'next';
import type { ApiRequestWithUser } from '../../../lib/auth/session';
import { authenticateUser } from '../../../services/authService';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_development_secret_do_not_use_in_production';

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
    
    // Sign secure JWT token
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Set secure HttpOnly cookie
    const isProd = process.env.NODE_ENV === 'production';
    res.setHeader(
      'Set-Cookie',
      `crm_session_token=${token}; Path=/; Max-Age=86400; HttpOnly; SameSite=Lax${isProd ? '; Secure' : ''}`
    );

    return res.status(200).json({ user });
  } catch (err: any) {
    return res.status(401).json({ error: err.message || 'Invalid credentials' });
  }
}

