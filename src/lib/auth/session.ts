import type { NextApiRequest, NextApiResponse } from 'next';
import type { RoleName } from './roles';
import { query } from '../db';

export interface SessionUser {
  id: number;
  email: string;
  name: string;
  role: RoleName;
}

export interface ApiRequestWithUser extends NextApiRequest {
  user?: SessionUser;
}

function pickActorId(req: NextApiRequest): number | null {
  const headerVal = req.headers['x-actor-id'];
  const headerId = Array.isArray(headerVal) ? headerVal[0] : headerVal;
  if (headerId) {
    const n = Number(headerId);
    if (!Number.isNaN(n) && n > 0) return n;
  }
  const bodyId = (req.body && (req.body as any).actorId) as unknown;
  if (bodyId !== undefined && bodyId !== null) {
    const n = Number(bodyId);
    if (!Number.isNaN(n) && n > 0) return n;
  }
  const queryVal = req.query?.actorId;
  const queryId = Array.isArray(queryVal) ? queryVal[0] : queryVal;
  if (queryId) {
    const n = Number(queryId);
    if (!Number.isNaN(n) && n > 0) return n;
  }
  return null;
}

import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_development_secret_do_not_use_in_production';

export async function getSessionUser(req: NextApiRequest): Promise<SessionUser | null> {
  let actorId: number | null = null;

  // 1. Try to read from the secure HttpOnly cookie crm_session_token
  const cookieVal = req.cookies?.crm_session_token;
  if (cookieVal) {
    try {
      const decoded = jwt.verify(cookieVal, JWT_SECRET) as { id: number };
      if (decoded && decoded.id) {
        actorId = decoded.id;
      }
    } catch {
      // Invalid or expired token
    }
  }

  // 2. Fall back to raw headers/body/query parameters ONLY in development mode
  if (!actorId && process.env.NODE_ENV !== 'production') {
    actorId = pickActorId(req);
  }

  if (!actorId) return null;

  try {
    const result = await query<{
      id: number;
      email: string;
      name: string | null;
      role_name: string;
    }>(
      `SELECT u.id, u.email, u.name, r.name AS role_name
         FROM users u
         JOIN roles r ON r.id = u.role_id
        WHERE u.id = $1`,
      [actorId],
    );
    const row = result.rows[0];
    if (!row) return null;
    return {
      id: row.id,
      email: row.email,
      name: row.name ?? row.email,
      role: row.role_name as RoleName,
    };
  } catch {
    return null;
  }
}

export function requireRole(res: NextApiResponse, user: SessionUser | null, allowed: RoleName[]) {
  if (!user || !allowed.includes(user.role)) {
    res.status(403).json({ error: 'Forbidden' });
    return false;
  }
  return true;
}

