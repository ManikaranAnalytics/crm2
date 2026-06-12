import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end('Method Not Allowed');
  }

  // Clear the secure HttpOnly cookie
  res.setHeader(
    'Set-Cookie',
    'crm_session_token=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax'
  );

  return res.status(200).json({ success: true });
}
