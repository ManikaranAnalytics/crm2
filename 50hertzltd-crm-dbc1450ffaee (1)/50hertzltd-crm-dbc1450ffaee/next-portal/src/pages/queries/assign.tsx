import React, { useEffect, useState } from 'react';
import Layout from '../../components/Layout';
import QueryTabs from '../../components/QueryTabs';
import { useAuth } from '../_app';

interface AssignableQuery {
	id: number;
	queryCode: string;
	clientName?: string;
	state?: string;
	status: string;
			attachments?: { fileName: string; url: string }[];
}

interface AssignUser {
	id: number;
	name: string;
	email: string;
	isActive: boolean;
}

const AssignQueriesPage: React.FC = () => {
	const { user } = useAuth();
	const [queries, setQueries] = useState<AssignableQuery[]>([]);
	const [users, setUsers] = useState<AssignUser[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [success, setSuccess] = useState<string | null>(null);
	const [assigningId, setAssigningId] = useState<number | null>(null);
	const [selectedAssignee, setSelectedAssignee] = useState<Record<number, string>>({});

			const canAssign = !!user && (user.email === 'himanshu.s@manikarananalytics.in' || user.role === 'ADMIN');

			useEffect(() => {
				if (!user || !canAssign) {
					return;
				}

		const load = async () => {
			setLoading(true);
			setError(null);
			try {
						const [queriesRes, usersRes] = await Promise.all([
							fetch(`/api/queries/assign?actorId=${user.id}`),
					fetch('/api/admin/users'),
				]);

				if (!queriesRes.ok) {
					const body = await queriesRes.json().catch(() => ({}));
					throw new Error(body.error || 'Failed to load assignable queries');
				}
				if (!usersRes.ok) {
					const body = await usersRes.json().catch(() => ({}));
					throw new Error(body.error || 'Failed to load users');
				}

				const queriesBody = await queriesRes.json();
				const usersBody = await usersRes.json();
				setQueries(queriesBody.queries || []);
				const allUsers: any[] = usersBody.users || [];
				setUsers(
					allUsers
						.filter((u) => u.isActive && u.email !== 'himanshu.s@manikarananalytics.in')
						.map((u) => ({ id: u.id, name: u.name, email: u.email, isActive: u.isActive })),
				);
			} catch (err: any) {
				setError(err.message || 'Failed to load data');
			} finally {
					setLoading(false);
				}
			};

				load();
			}, [user, canAssign]);

	const handleAssign = async (queryId: number) => {
		if (!user) return;
		const assigneeIdStr = selectedAssignee[queryId];
		if (!assigneeIdStr) {
			setError('Select a user to assign this query to.');
			return;
		}

		setAssigningId(queryId);
		setError(null);
		setSuccess(null);
		try {
			const res = await fetch('/api/queries/assign', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ queryId, assigneeId: Number(assigneeIdStr), actorId: user.id }),
			});
			if (!res.ok) {
				const body = await res.json().catch(() => ({}));
				throw new Error(body.error || 'Failed to assign query');
			}
			// Remove from list after successful assignment
			setQueries((prev) => prev.filter((q) => q.id !== queryId));
			setSuccess('Query assigned successfully.');
		} catch (err: any) {
			setError(err.message || 'Failed to assign query');
		} finally {
			setAssigningId(null);
		}
	};

	if (!user) {
		return (
			<Layout>
				<div className="space-y-4">
					<h2 className="text-2xl font-semibold text-slate-900">Queries</h2>
					<p className="text-sm text-slate-500">Please sign in to assign queries.</p>
				</div>
			</Layout>
		);
	}

			if (!canAssign) {
		return (
			<Layout>
				<div className="space-y-4">
					<h2 className="text-2xl font-semibold text-slate-900">Queries</h2>
							<p className="text-sm text-slate-500">Only the CRM Head or Admin can assign queries.</p>
				</div>
			</Layout>
		);
	}

	return (
		<Layout>
			<div className="space-y-4">
				<div>
					<h2 className="text-2xl font-semibold text-slate-900">Queries</h2>
					<p className="text-sm text-slate-500">Assign open queries to team members.</p>
				</div>
				<QueryTabs active="ASSIGN" />
				<div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
					{error && (
						<p className="border-b border-slate-100 bg-red-50 px-4 py-2 text-sm text-red-700">{error}</p>
					)}
					{success && (
						<p className="border-b border-slate-100 bg-emerald-50 px-4 py-2 text-sm text-emerald-700">{success}</p>
					)}
					<div className="overflow-x-auto">
						<table className="min-w-full divide-y divide-slate-200 text-sm">
							<thead className="bg-slate-50">
								<tr>
									<th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
										Code
									</th>
									<th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
										Client
									</th>
									<th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
										State
									</th>
										<th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
											Email (.msg)
										</th>
									<th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
										Status
									</th>
									<th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
										Assign To
									</th>
									<th className="px-4 py-2" />
								</tr>
							</thead>
							<tbody className="divide-y divide-slate-100 bg-white">
								{loading && (
									<tr>
												<td colSpan={7} className="px-4 py-6 text-center text-sm text-slate-500">
											Loading assignable queries...
										</td>
									</tr>
								)}
								{!loading && queries.length === 0 && !error && (
									<tr>
												<td colSpan={7} className="px-4 py-6 text-center text-sm text-slate-500">
											No open unassigned queries found.
										</td>
									</tr>
								)}
								{!loading &&
									queries.map((q) => (
										<tr key={q.id}>
											<td className="px-4 py-2 font-mono text-xs text-slate-700">{q.queryCode}</td>
											<td className="px-4 py-2 text-slate-800">{q.clientName || '-'}</td>
											<td className="px-4 py-2 text-slate-700">{q.state || '-'}</td>
													<td className="px-4 py-2 text-[11px] text-slate-700">
														{!q.attachments || q.attachments.length === 0 && (
															<span className="text-slate-400">No email</span>
														)}
														{q.attachments && q.attachments.length === 1 && (
															<p>
																<span className="mr-1 font-semibold text-slate-600">
																	Client mail (original):
																</span>
																<a
																		href={q.attachments[0].url}
																		target="_blank"
																		rel="noreferrer"
																		className="text-indigo-600 hover:underline"
																	>
																		{q.attachments[0].fileName}
																	</a>
															</p>
														)}
														{q.attachments && q.attachments.length > 1 && (
															<p>
																{(() => {
																		const client = q.attachments[0];
																		const solution = q.attachments[1];
																		const extraCount = q.attachments.length - 2;
																		return (
																			<>
																				<span className="mr-1 font-semibold text-slate-600">
																					Client mail (original):
																				</span>
																				<a
																						href={client.url}
																						target="_blank"
																						rel="noreferrer"
																						className="text-indigo-600 hover:underline"
																					>
																						{client.fileName}
																					</a>
																				<span className="mx-1 text-slate-400">+ </span>
																				<span className="mr-1 font-semibold text-slate-600">
																					Solution mail (closure):
																				</span>
																				<a
																						href={solution.url}
																						target="_blank"
																						rel="noreferrer"
																						className="text-indigo-600 hover:underline"
																					>
																						{solution.fileName}
																					</a>
																				{extraCount > 0 && (
																						<span className="ml-1 text-[10px] text-slate-400">
																							(+{extraCount} more)
																						</span>
																				)}
																			</>
																		);
																	})()}
															</p>
														)}
													</td>
													<td className="px-4 py-2 text-slate-700">{q.status}</td>
											<td className="px-4 py-2">
												<select
													className="block w-full rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 shadow-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
													value={selectedAssignee[q.id] || ''}
													onChange={(e) =>
														setSelectedAssignee((prev) => ({ ...prev, [q.id]: e.target.value }))
													}
												>
													<option value="">Select user</option>
													{users.map((u) => (
														<option key={u.id} value={u.id}>
															{u.name} ({u.email})
														</option>
													))}
												</select>
											</td>
											<td className="px-4 py-2 text-right">
												<button
													type="button"
													className="inline-flex items-center rounded-md bg-teal-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-teal-700 disabled:opacity-60"
													disabled={assigningId === q.id}
													onClick={() => handleAssign(q.id)}
												>
													{assigningId === q.id ? 'Assigning…' : 'Assign'}
												</button>
											</td>
										</tr>
									))}
								</tbody>
							</table>
					</div>
				</div>
			</div>
		</Layout>
	);
};

export default AssignQueriesPage;
