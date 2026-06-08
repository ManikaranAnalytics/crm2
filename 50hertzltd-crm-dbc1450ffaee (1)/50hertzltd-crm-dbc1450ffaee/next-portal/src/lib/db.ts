import { Pool } from 'pg';

let pool: Pool | null = null;

export function getDbPool(): Pool {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error('DATABASE_URL is not set. Please add it to your environment (e.g. .env file).');
    }

    pool = new Pool({ connectionString });
  }

  return pool;
}

export async function query<T = any>(text: string, params: any[] = []): Promise<{ rows: T[] }> {
  const client = getDbPool();
  const result = await client.query(text, params);
  return { rows: result.rows as T[] };
}

