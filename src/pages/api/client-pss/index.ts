import type { NextApiRequest, NextApiResponse } from 'next';
import { getSessionUser } from '../../../lib/auth/session';
import { CAN_MANAGE_QUERIES } from '../../../lib/auth/roles';
import { query } from '../../../lib/db';

type Technology =
  | 'SOLAR'
  | 'WIND'
  | 'SOLAR_WIND'
  | 'SOLAR_WIND_BATTERY'
  | 'SOLAR_BATTERY'
  | 'WIND_BATTERY';

type TransmissionType = 'STU' | 'CTU';

interface ClientPssRow {
  id: number;
  client_id: number;
  name: string;
  state: string | null;
  capacity_mw: string | null;
  technology: Technology | null;
  transmission_type: TransmissionType | null;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const user = await getSessionUser(req);
  if (!user || !CAN_MANAGE_QUERIES.includes(user.role)) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end('Method Not Allowed');
  }

  const clientIdParam = Array.isArray(req.query.clientId)
    ? req.query.clientId[0]
    : req.query.clientId;
  const clientId = clientIdParam ? Number(clientIdParam) : NaN;
  const hasClient = clientIdParam != null && clientIdParam !== '';

  if (hasClient && (!Number.isFinite(clientId) || clientId <= 0)) {
    return res.status(400).json({ error: 'clientId must be a positive number' });
  }

  try {
    const where = hasClient ? 'WHERE client_id = $1' : '';
    const params = hasClient ? [clientId] : [];

    const result = await query<ClientPssRow>(
      `SELECT id, client_id, name, state, capacity_mw, technology, transmission_type
         FROM client_pss
         ${where}
        ORDER BY name ASC`,
      params,
    );

    return res.status(200).json({
      pss: result.rows.map((row) => ({
        id: row.id,
        clientId: row.client_id,
        name: row.name,
        state: row.state,
        capacityMw: row.capacity_mw == null ? null : Number(row.capacity_mw),
        technology: row.technology,
        transmissionType: row.transmission_type,
      })),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to load client PSS list';
    return res.status(500).json({ error: message });
  }
}
