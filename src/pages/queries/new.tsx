import React, { useEffect, useMemo, useRef, useState } from 'react';
import Layout from '../../components/Layout';
import QueryTabs from '../../components/QueryTabs';
import { exportDraftEml } from '../../lib/exportEml';
import { EMAIL_FILE_ACCEPT, isEmailFileName } from '../../lib/email/emailFileValidation';
import { authHeaders, useAuth } from '../_app';

interface PssOption {
	id: number;
	name: string;
	utility: string | null;
	state: string | null;
	capacityMw: number | null;
	type: string | null;
	technology: string | null;
	transmissionType: 'STU' | 'CTU' | null;
}

interface ClientOption {
	id: number;
	name: string;
	state: string | null;
	isApproved: boolean;
	pssCount: number;
}

interface ClientPssOption {
	id: number;
	clientId: number;
	name: string;
	state: string | null;
	capacityMw: number | null;
	technology: string | null;
	transmissionType: 'STU' | 'CTU' | null;
}

	type IssueType = 'HIGH_DSM' | 'OTHER';
	// type InitialStatus = 'OPEN' | 'CLOSED';

	const NewQueryPage: React.FC = () => {
		const { user } = useAuth();
		const canAddQuery = !!user && ['ADMIN', 'MANAGER', 'KAM'].includes(user.role);
		const [form, setForm] = useState({
			clientId: '' as string,
			clientName: '',
			pssId: '' as string,
			pssText: '',
			state: '',
			capacityMw: '',
			technology: '',
			transmissionType: '',
			issueStartDate: '',
			issueEndDate: '',
			issueType: 'HIGH_DSM' as IssueType,
			issueOtherText: '',
			// status: 'OPEN' as InitialStatus,
		});
	const [clientList, setClientList] = useState<ClientOption[]>([]);
	const [clientPssList, setClientPssList] = useState<ClientPssOption[]>([]);
	const [clientQuery, setClientQuery] = useState('');
	const [clientOpen, setClientOpen] = useState(false);
	const [clientHighlight, setClientHighlight] = useState(0);
	const [loadingClientPss, setLoadingClientPss] = useState(false);
	const [pssList, setPssList] = useState<PssOption[]>([]);
	const [pssQuery, setPssQuery] = useState('');
	const [pssOpen, setPssOpen] = useState(false);
	const [pssHighlight, setPssHighlight] = useState(0);
	const [attachment, setAttachment] = useState<{
		fileName: string;
		dataBase64: string;
		contentType: string;
	} | null>(null);
	const [message, setMessage] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [submitting, setSubmitting] = useState(false);
	const [loadingLookups, setLoadingLookups] = useState(false);
	const fileInputRef = useRef<HTMLInputElement | null>(null);
	const clientBoxRef = useRef<HTMLDivElement | null>(null);
	const pssBoxRef = useRef<HTMLDivElement | null>(null);

	useEffect(() => {
		const loadLookups = async () => {
			setLoadingLookups(true);
			setError(null);
			try {
				const [pssRes, clientsRes] = await Promise.all([
					fetch('/api/pss-master', { headers: authHeaders() }),
					fetch('/api/clients', { headers: authHeaders() }),
				]);
				if (!pssRes.ok) {
					throw new Error('Failed to load PSS list');
				}
				if (!clientsRes.ok) {
					throw new Error('Failed to load client list');
				}
				const pssData = await pssRes.json();
				const clientsData = await clientsRes.json();
				setPssList(
					(pssData.pss || []).map((p: any) => ({
						id: p.id,
						name: p.name,
						utility: p.utility ?? null,
						state: p.state ?? null,
						capacityMw: p.capacityMw ?? null,
						type: p.type ?? null,
						technology: p.technology ?? null,
						transmissionType: p.transmissionType ?? null,
					})),
				);
				setClientList(
					(clientsData.clients || []).map((c: any) => ({
						id: c.id,
						name: c.name,
						state: c.state ?? null,
						isApproved: !!c.isApproved,
						pssCount: c.pssCount ?? 0,
					})),
				);
			} catch (err: any) {
				setError(err.message || 'Failed to load lookups');
			} finally {
				setLoadingLookups(false);
			}
		};

		loadLookups();
	}, []);

	useEffect(() => {
		if (!form.clientId) {
			setClientPssList([]);
			return;
		}

		let cancelled = false;
		const loadClientPss = async () => {
			setLoadingClientPss(true);
			try {
				const res = await fetch(`/api/client-pss?clientId=${form.clientId}`, {
					headers: authHeaders(),
				});
				if (!res.ok) {
					throw new Error('Failed to load PSS for selected client');
				}
				const data = await res.json();
				if (!cancelled) {
					setClientPssList(
						(data.pss || []).map((p: any) => ({
							id: p.id,
							clientId: p.clientId,
							name: p.name,
							state: p.state ?? null,
							capacityMw: p.capacityMw ?? null,
							technology: p.technology ?? null,
							transmissionType: p.transmissionType ?? null,
						})),
					);
				}
			} catch {
				if (!cancelled) setClientPssList([]);
			} finally {
				if (!cancelled) setLoadingClientPss(false);
			}
		};

		loadClientPss();
		return () => {
			cancelled = true;
		};
	}, [form.clientId]);

	useEffect(() => {
		const handleDocClick = (e: MouseEvent) => {
			if (clientBoxRef.current && !clientBoxRef.current.contains(e.target as Node)) {
				setClientOpen(false);
			}
			if (pssBoxRef.current && !pssBoxRef.current.contains(e.target as Node)) {
				setPssOpen(false);
			}
		};
		document.addEventListener('mousedown', handleDocClick);
		return () => document.removeEventListener('mousedown', handleDocClick);
	}, []);

	const filteredClients = useMemo(() => {
		const q = clientQuery.trim().toLowerCase();
		const list = q
			? clientList.filter((c) => c.name.toLowerCase().includes(q))
			: clientList;
		return list.slice(0, 100);
	}, [clientList, clientQuery]);

	const activePssSource = form.clientId && clientPssList.length > 0 ? 'client' : 'master';

	const filteredPss = useMemo(() => {
		const q = pssQuery.trim().toLowerCase();
		if (activePssSource === 'client') {
			const list = q
				? clientPssList.filter((p) => p.name.toLowerCase().includes(q))
				: clientPssList;
			return list.slice(0, 100);
		}
		const list = q ? pssList.filter((p) => p.name.toLowerCase().includes(q)) : pssList;
		return list.slice(0, 100);
	}, [activePssSource, clientPssList, pssList, pssQuery]);

	const selectClient = (c: ClientOption) => {
		setForm((prev) => ({
			...prev,
			clientId: String(c.id),
			clientName: c.name,
			pssId: '',
			pssText: '',
			state: '',
			capacityMw: '',
			technology: '',
			transmissionType: '',
		}));
		setClientQuery(c.name);
		setClientOpen(false);
		setPssQuery('');
	};

	const selectClientPss = (p: ClientPssOption) => {
		const masterMatch = pssList.find((m) => m.name.toLowerCase() === p.name.toLowerCase());
		setForm((prev) => ({
			...prev,
			pssId: masterMatch ? String(masterMatch.id) : String(p.id),
			pssText: p.name,
			state: p.state ?? masterMatch?.state ?? '',
			capacityMw:
				p.capacityMw != null
					? String(p.capacityMw)
					: masterMatch?.capacityMw != null
						? String(masterMatch.capacityMw)
						: '',
			technology: p.technology ?? masterMatch?.technology ?? '',
			transmissionType: p.transmissionType ?? masterMatch?.transmissionType ?? '',
		}));
		setPssQuery(p.name);
		setPssOpen(false);
	};

	const pickPssAtIndex = (idx: number) => {
		const pick = filteredPss[idx];
		if (!pick) return;
		if (activePssSource === 'client') {
			selectClientPss(pick as ClientPssOption);
		} else {
			selectPss(pick as PssOption);
		}
	};

	const selectPss = (p: PssOption) => {
		setForm((prev) => ({
			...prev,
			pssId: String(p.id),
			pssText: p.name,
			state: p.state ?? '',
			capacityMw: p.capacityMw != null ? String(p.capacityMw) : '',
			technology: p.technology ?? '',
			transmissionType: p.transmissionType ?? '',
		}));
		setPssQuery(p.name);
		setPssOpen(false);
	};

	const handleChange = (
		e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
	) => {
		const { name, value } = e.target;
		setForm((prev) => ({ ...prev, [name]: value }));
	};

	const handleIssueTypeChange = (value: IssueType) => {
		setForm((prev) => ({ ...prev, issueType: value }));
	};

	// const handleStatusChange = (value: InitialStatus) => {
	// 	setForm((prev) => ({ ...prev, status: value }));
	// };

	const handleAttachmentFile = (file: File | null) => {
		if (!file) return;
		if (!isEmailFileName(file.name)) {
			setError('Please upload a .msg or .eml email file');
			return;
		}
		if (file.size > 20 * 1024 * 1024) {
			setError('File size must be less than 20MB');
			return;
		}
		setError(null);
		const reader = new FileReader();
		reader.onload = () => {
			const result = reader.result;
			if (typeof result === 'string') {
				const base64 = result.includes(',') ? result.split(',')[1] : result;
				setAttachment({
					fileName: file.name,
					dataBase64: base64,
					contentType: file.type || 'application/octet-stream',
				});
			}
		};
		reader.readAsDataURL(file);
	};

	const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
		e.preventDefault();
		if (e.dataTransfer.files && e.dataTransfer.files[0]) {
			handleAttachmentFile(e.dataTransfer.files[0]);
		}
	};

	const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
		e.preventDefault();
	};

	const getIssueValue = (): string =>
		form.issueType === 'HIGH_DSM'
			? 'High DSM'
			: form.issueOtherText.trim() || 'Other';

	const handleExportEml = () => {
		const issueValue = getIssueValue();
		const subjectParts = [form.pssText, form.clientName].filter(Boolean);
		exportDraftEml({
			subject: subjectParts[0] || 'New Ticket',
			body: issueValue,
			attachments: attachment ? [attachment] : [],
			downloadFileName: subjectParts[0] || 'new_query_draft',
		});
	};

		const handleSubmit = async (e: React.FormEvent) => {
			e.preventDefault();
			setMessage(null);
			setError(null);
			if (form.capacityMw) {
				const capVal = parseFloat(form.capacityMw);
				if (isNaN(capVal) || capVal <= 0) {
					setError('Capacity (MW) must be a positive number');
					return;
				}
			}
			// Require the original client email (.msg or .eml) for every new query
			if (!attachment) {
				setError('Please attach the client email (.msg or .eml) before saving the ticket.');
				return;
			}
			setSubmitting(true);
		try {
			const issueValue = getIssueValue();
			const periodOfIssue =
					form.issueStartDate && form.issueEndDate
						? `${form.issueStartDate} to ${form.issueEndDate}`
						: undefined;
				const payload: any = {
				clientId: form.clientId ? Number(form.clientId) : undefined,
				clientName: form.clientName.trim() || undefined,
				pssId: form.pssId ? Number(form.pssId) : undefined,
				pssText: form.pssText || undefined,
				state: form.state || undefined,
				capacityMw: form.capacityMw || undefined,
				technology: form.technology || undefined,
				transmissionType: form.transmissionType || undefined,
				periodOfIssue,
					issue: issueValue,
					// status: form.status,
					attachment,
				};
			const res = await fetch('/api/queries', {
				method: 'POST',
				headers: authHeaders({ 'Content-Type': 'application/json' }),
				body: JSON.stringify(payload),
			});
			if (!res.ok) {
				const body = await res.json().catch(() => ({}));
				throw new Error(body.error || 'Failed to create ticket');
			}
			setMessage('Ticket created successfully');
		} catch (err: any) {
			setError(err.message || 'Failed to create ticket');
		} finally {
			setSubmitting(false);
		}
	};

		if (!user) {
			return (
				<Layout>
					<div className="space-y-4">
						<h2 className="text-2xl font-semibold text-slate-900">Tickets</h2>
						<p className="text-sm text-slate-500">Please sign in to create a ticket.</p>
					</div>
				</Layout>
			);
		}

		if (!canAddQuery) {
			return (
				<Layout>
					<div className="space-y-4">
						<h2 className="text-2xl font-semibold text-slate-900">Tickets</h2>
						<p className="text-sm text-slate-500">You are not authorized to create tickets.</p>
					</div>
				</Layout>
			);
		}

		return (
			<Layout>
				<div className="space-y-4">
					<QueryTabs active="ADD" />
					<div className="mt-4 grid gap-8 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
					<form
						onSubmit={handleSubmit}
						className="space-y-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm"
					>
						{error && (
							<p className="rounded border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700">
								{error}
							</p>
						)}
						<div className="grid gap-4 md:grid-cols-2">
							<div ref={clientBoxRef} className="relative">
								<label className="block text-sm font-medium text-slate-700" htmlFor="client">
									Client
								</label>
								<input
									id="client"
									type="text"
									autoComplete="off"
									value={clientQuery}
									placeholder={loadingLookups ? 'Loading clients…' : 'Search client by name'}
									onChange={(e) => {
										setClientQuery(e.target.value);
										setClientOpen(true);
										setClientHighlight(0);
										if (form.clientId) {
											setForm((prev) => ({
												...prev,
												clientId: '',
												clientName: e.target.value,
												pssId: '',
												pssText: '',
												state: '',
												capacityMw: '',
												technology: '',
												transmissionType: '',
											}));
											setPssQuery('');
										} else {
											setForm((prev) => ({ ...prev, clientName: e.target.value }));
										}
									}}
									onFocus={() => setClientOpen(true)}
									onKeyDown={(e) => {
										if (!clientOpen && (e.key === 'ArrowDown' || e.key === 'Enter')) {
											setClientOpen(true);
											return;
										}
										if (e.key === 'ArrowDown') {
											e.preventDefault();
											setClientHighlight((h) => Math.min(h + 1, filteredClients.length - 1));
										} else if (e.key === 'ArrowUp') {
											e.preventDefault();
											setClientHighlight((h) => Math.max(h - 1, 0));
										} else if (e.key === 'Enter') {
											e.preventDefault();
											const pick = filteredClients[clientHighlight];
											if (pick) selectClient(pick);
										} else if (e.key === 'Escape') {
											setClientOpen(false);
										}
									}}
									disabled={loadingLookups}
									className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500 disabled:bg-slate-50"
								/>
								{clientOpen && filteredClients.length > 0 && (
									<ul className="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-md border border-slate-200 bg-white py-1 text-sm shadow-lg">
										{filteredClients.map((c, idx) => (
											<li
												key={c.id}
												onMouseDown={(e) => {
													e.preventDefault();
													selectClient(c);
												}}
												onMouseEnter={() => setClientHighlight(idx)}
												className={`cursor-pointer px-3 py-1.5 ${
													idx === clientHighlight ? 'bg-teal-50 text-teal-800' : 'text-slate-700 hover:bg-slate-50'
												}`}
											>
												<div className="font-medium">{c.name}</div>
												<div className="text-[11px] text-slate-500">
													{[c.state, c.pssCount ? `${c.pssCount} PSS` : null, c.isApproved ? 'Approved' : 'Pending']
														.filter(Boolean)
														.join(' · ')}
												</div>
											</li>
										))}
									</ul>
								)}
								{clientOpen && !loadingLookups && filteredClients.length === 0 && (
									<div className="absolute z-20 mt-1 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-xs text-slate-500 shadow-lg">
										No clients found. Ask an admin to add clients in Admin.
									</div>
								)}
							</div>
							<div ref={pssBoxRef} className="relative">
								<label className="block text-sm font-medium text-slate-700" htmlFor="pss">
									PSS
									{form.clientId && (
										<span className="ml-1 text-[11px] font-normal text-slate-500">
											{loadingClientPss
												? '(loading client PSS…)'
												: clientPssList.length > 0
													? '(from client PSS)'
													: '(from PSS master)'}
										</span>
									)}
								</label>
								<input
									id="pss"
									type="text"
									autoComplete="off"
									value={pssQuery}
									placeholder={
										loadingLookups || loadingClientPss
											? 'Loading PSS list…'
											: form.clientId
												? 'Search PSS for selected client'
												: 'Search PSS by name'
									}
									onChange={(e) => {
										setPssQuery(e.target.value);
										setPssOpen(true);
										setPssHighlight(0);
										if (form.pssId) {
											setForm((prev) => ({ ...prev, pssId: '', pssText: e.target.value }));
										} else {
											setForm((prev) => ({ ...prev, pssText: e.target.value }));
										}
									}}
									onFocus={() => setPssOpen(true)}
									onKeyDown={(e) => {
										if (!pssOpen && (e.key === 'ArrowDown' || e.key === 'Enter')) {
											setPssOpen(true);
											return;
										}
										if (e.key === 'ArrowDown') {
											e.preventDefault();
											setPssHighlight((h) => Math.min(h + 1, filteredPss.length - 1));
										} else if (e.key === 'ArrowUp') {
											e.preventDefault();
											setPssHighlight((h) => Math.max(h - 1, 0));
										} else if (e.key === 'Enter') {
											e.preventDefault();
											pickPssAtIndex(pssHighlight);
										} else if (e.key === 'Escape') {
											setPssOpen(false);
										}
									}}
									disabled={loadingLookups || loadingClientPss}
									className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500 disabled:bg-slate-50"
								/>
								{pssOpen && filteredPss.length > 0 && (
									<ul className="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-md border border-slate-200 bg-white py-1 text-sm shadow-lg">
										{filteredPss.map((p, idx) => {
											const isClientPss = activePssSource === 'client';
											const clientPss = p as ClientPssOption;
											const masterPss = p as PssOption;
											return (
											<li
												key={`${activePssSource}-${p.id}`}
												onMouseDown={(e) => {
													e.preventDefault();
													pickPssAtIndex(idx);
												}}
												onMouseEnter={() => setPssHighlight(idx)}
												className={`cursor-pointer px-3 py-1.5 ${
													idx === pssHighlight ? 'bg-teal-50 text-teal-800' : 'text-slate-700 hover:bg-slate-50'
												}`}
											>
												<div className="font-medium">{p.name}</div>
												<div className="text-[11px] text-slate-500">
													{[
														p.state,
														p.capacityMw != null ? `${p.capacityMw} MW` : null,
														isClientPss ? clientPss.technology : masterPss.type,
														isClientPss ? clientPss.transmissionType : masterPss.transmissionType,
													]
														.filter(Boolean)
														.join(' · ')}
												</div>
											</li>
											);
										})}
									</ul>
								)}
								{pssOpen && !loadingLookups && !loadingClientPss && filteredPss.length === 0 && (
									<div className="absolute z-20 mt-1 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-xs text-slate-500 shadow-lg">
										{form.clientId
											? 'No PSS linked to this client. Select from PSS master or add in Admin.'
											: 'No PSS matches. Ask a manager to add it in Admin.'}
									</div>
								)}
							</div>
							<div>
								<label className="block text-sm font-medium text-slate-700" htmlFor="state">
									State
								</label>
								<input
									id="state"
									name="state"
									value={form.state}
									onChange={handleChange}
									className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
								/>
							</div>
							<div>
								<label className="block text-sm font-medium text-slate-700" htmlFor="capacityMw">
									Capacity (MW)
								</label>
								<input
									id="capacityMw"
									name="capacityMw"
									value={form.capacityMw}
									onChange={handleChange}
									className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
								/>
							</div>
							<div>
								<label className="block text-sm font-medium text-slate-700" htmlFor="technology">
									Technology
								</label>
								<input
									id="technology"
									name="technology"
									value={form.technology}
									onChange={handleChange}
									className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
								/>
							</div>
							<div>
								<label className="block text-sm font-medium text-slate-700" htmlFor="transmissionType">
									Transmission Type (STU / CTU)
								</label>
								<input
									id="transmissionType"
									name="transmissionType"
									value={form.transmissionType}
									onChange={handleChange}
									className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
								/>
							</div>
				<div>
					<label className="block text-sm font-medium text-slate-700" htmlFor="issueStartDate">
						Issue Period
					</label>
					<div className="mt-1 flex items-center gap-2">
						<input
							id="issueStartDate"
							name="issueStartDate"
							type="date"
							value={form.issueStartDate}
							onChange={handleChange}
							className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
						/>
						<span className="text-xs text-slate-500">to</span>
						<input
							id="issueEndDate"
							name="issueEndDate"
							type="date"
							value={form.issueEndDate}
							onChange={handleChange}
							className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
						/>
					</div>
					<p className="mt-1 text-[11px] text-slate-500">Select the start and end dates from the calendar.</p>
				</div>
						</div>

						<div className="space-y-3">
							<span className="block text-sm font-medium text-slate-700">Issue</span>
							<div className="flex flex-wrap items-center gap-4 text-sm">
								<label className="inline-flex items-center gap-2">
									<input
										type="radio"
										name="issueType"
										checked={form.issueType === 'HIGH_DSM'}
										onChange={() => handleIssueTypeChange('HIGH_DSM')}
										className="h-3.5 w-3.5 border-slate-300 text-teal-600"
									/>
									<span>High DSM</span>
								</label>
								<label className="inline-flex items-center gap-2">
									<input
										type="radio"
										name="issueType"
										checked={form.issueType === 'OTHER'}
										onChange={() => handleIssueTypeChange('OTHER')}
										className="h-3.5 w-3.5 border-slate-300 text-teal-600"
									/>
									<span>Other</span>
								</label>
							</div>
							{form.issueType === 'OTHER' && (
								<textarea
									id="issueOtherText"
									name="issueOtherText"
									value={form.issueOtherText}
									onChange={handleChange}
									rows={3}
									className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
									placeholder="Describe the issue"
								/>
							)}
						</div>

						{/* <div className="space-y-2">
							<span className="block text-sm font-medium text-slate-700">Initial Status</span>
							<div className="flex items-center gap-4 text-sm">
								<label className="inline-flex items-center gap-2">
									<input
										type="radio"
										name="status"
										checked={form.status === 'OPEN'}
										onChange={() => handleStatusChange('OPEN')}
										className="h-3.5 w-3.5 border-slate-300 text-teal-600"
									/>
									<span>Open</span>
								</label>
								<label className="inline-flex items-center gap-2">
									<input
										type="radio"
										name="status"
										checked={form.status === 'CLOSED'}
										onChange={() => handleStatusChange('CLOSED')}
										className="h-3.5 w-3.5 border-slate-300 text-teal-600"
									/>
									<span>Close (will go to Himanshu for approval)</span>
								</label>
							</div>
						</div> */}

						<div className="flex flex-wrap items-center gap-3">
							<button
								type="submit"
								disabled={submitting}
								className="inline-flex items-center rounded-md bg-teal-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-70"
							>
								{submitting ? 'Saving...' : 'Save Ticket'}
							</button>
							<button
								type="button"
								onClick={handleExportEml}
								className="inline-flex items-center rounded-md border border-indigo-200 bg-indigo-50 px-4 py-2 text-sm font-semibold text-indigo-700 shadow-sm hover:bg-indigo-100"
							>
								Export Draft (.eml)
							</button>
						</div>

						{message && !error && <p className="text-sm text-teal-700">{message}</p>}
					</form>

					<section className="space-y-3 rounded-lg border border-dashed border-slate-300 bg-slate-50 p-5 text-sm">
						<div>
							<h3 className="text-sm font-semibold text-slate-900">Attach email (.msg or .eml)</h3>
							<p className="mt-1 text-xs text-slate-500">
								Drag and drop the email (.msg or .eml) related to this ticket, or click to browse.
								Himanshu will be able to download and review it while assigning/approving.
							</p>
						</div>
						<div
							onDrop={handleDrop}
							onDragOver={handleDragOver}
							onClick={() => fileInputRef.current?.click()}
							className="flex cursor-pointer flex-col items-center justify-center rounded-md border border-dashed border-slate-300 bg-white px-4 py-8 text-center text-xs text-slate-500 hover:border-teal-400 hover:bg-teal-50"
						>
							<p className="font-medium text-slate-700">
								{attachment ? attachment.fileName : 'Drop .msg or .eml file here or click to upload'}
							</p>
							<p className="mt-1 text-[11px] text-slate-500">Supported formats: .msg, .eml</p>
							<input
								ref={fileInputRef}
								type="file"
								accept={EMAIL_FILE_ACCEPT}
								className="hidden"
								onChange={(e) => handleAttachmentFile(e.target.files?.[0] || null)}
							/>
						</div>
					</section>
				</div>
			</div>
		</Layout>
	);
};

export default NewQueryPage;
