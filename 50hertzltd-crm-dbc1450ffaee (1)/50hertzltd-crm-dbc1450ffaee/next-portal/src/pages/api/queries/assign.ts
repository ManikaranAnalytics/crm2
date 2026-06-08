import type { NextApiRequest, NextApiResponse } from 'next';
import { query } from '../../../lib/db';
import { assignQueryToUser, listAssignableQueries } from '../../../services/queryService';

async function ensureActorCanAssign(actorId: number): Promise<void> {
		if (!actorId || Number.isNaN(actorId)) {
			throw new Error('Valid actorId is required');
		}

		const result = await query<{ email: string; role_name: string }>(
			`SELECT u.email, r.name AS role_name
			   FROM users u
			   JOIN roles r ON r.id = u.role_id
			  WHERE u.id = $1`,
			[actorId],
		);
		const row = result.rows[0];
		if (!row) {
			throw new Error('Actor not found');
		}
		const isHimanshu = row.email === 'himanshu.s@manikarananalytics.in';
		const isAdmin = row.role_name === 'ADMIN';
		if (!isHimanshu && !isAdmin) {
			throw new Error('Only CRM Head or Admin can assign queries');
		}
	}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
	if (req.method === 'GET') {
		const actorRaw = Array.isArray(req.query.actorId) ? req.query.actorId[0] : req.query.actorId;
		const actorId = Number(actorRaw);

		try {
					await ensureActorCanAssign(actorId);
			const queries = await listAssignableQueries();
			return res.status(200).json({ queries });
		} catch (err: any) {
			const message = err.message || 'Failed to load assignable queries';
					if (message.startsWith('Only CRM Head')) {
				return res.status(403).json({ error: message });
			}
			return res.status(400).json({ error: message });
		}
	}

	if (req.method === 'POST') {
		const { queryId, assigneeId, actorId } = req.body || {};
		const qId = Number(queryId);
		const aId = Number(assigneeId);
		const actor = Number(actorId);

		try {
					await ensureActorCanAssign(actor);
			const updated = await assignQueryToUser(qId, aId);
			return res.status(200).json({ query: updated });
		} catch (err: any) {
			const message = err.message || 'Failed to assign query';
					if (message.startsWith('Only CRM Head')) {
				return res.status(403).json({ error: message });
			}
			return res.status(400).json({ error: message });
		}
	}

	res.setHeader('Allow', ['GET', 'POST']);
	return res.status(405).end('Method Not Allowed');
}
