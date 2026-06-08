import type { RoleName } from '../lib/auth/roles';
import { query } from '../lib/db';

export interface AuthUser {
  id: number;
  email: string;
  name: string;
  role: RoleName;
  rank: number;
}

interface AuthRow {
  id: number;
  email: string;
  name: string;
  rank: number;
  is_active: boolean;
  password_hash: string;
  role_name: RoleName;
}

// NOTE: This currently uses plain-text password comparison because passwords
// are stored as-is in the users.password_hash column. Replace with real
// hashing (bcrypt/argon2) when hardening auth.
export async function authenticateUser(email: string, password: string): Promise<AuthUser> {
  if (!email || !password) {
    throw new Error('Email and password are required');
  }

  const normalizedEmail = email.trim().toLowerCase();

  const result = await query<AuthRow>(
    `SELECT u.id,
            u.email,
            u.name,
            u.rank,
            u.is_active,
            u.password_hash,
            r.name AS role_name
       FROM users u
       JOIN roles r ON u.role_id = r.id
      WHERE LOWER(u.email) = $1`,
    [normalizedEmail],
  );

  const row = result.rows[0];

  if (!row || !row.is_active) {
    throw new Error('Invalid credentials');
  }

  if (row.password_hash !== password) {
    throw new Error('Invalid credentials');
  }

  return {
    id: row.id,
    email: row.email,
    name: row.name,
    role: row.role_name,
    rank: row.rank,
  };
}
