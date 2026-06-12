import React, { useEffect, useMemo, useRef, useState } from 'react';
import Layout from '../../components/Layout';
import QueryTabs from '../../components/QueryTabs';
import { exportDraftEml } from '../../lib/exportEml';
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

	type IssueType = 'HIGH_DSM' | 'OTHER';
	// type InitialStatus = 'OPEN' | 'CLOSED';

	const NewQueryPage: React.FC = () => {
		const { user } = useAuth();
		const canAddQuery = !!user && ['ADMIN', 'MANAGER', 'KAM'].includes(user.role);
		const [form, setForm] = useState({
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
	const pssBoxRef = useRef<HTMLDivElement | null>(null);

	useEffect(() => {
		const loadLookups = async () => {
			setLoadingLookups(true);
			setError(null);
			try {
				const pssRes = await fetch('/api/pss-master');
				if (!pssRes.ok) {
					throw new Error('Failed to load PSS list');
				}
				const pssData = await pssRes.json();
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
			} catch (err: any) {
				setError(err.message || 'Failed to load lookups');
			} finally {
				setLoadingLookups(false);
			}
		};

		loadLookups();
	}, []);

	useEffect(() => {
		const handleDocClick = (e: MouseEvent) => {
			if (pssBoxRef.current && !pssBoxRef.current.contains(e.target as Node)) {
				setPssOpen(false);
			}
		};
		document.addEventListener('mousedown', handleDocClick);
		return () => document.removeEventListener('mousedown', handleDocClick);
	}, []);

	const filteredPss = useMemo(() => {
		const q = pssQuery.trim().toLowerCase();
		const list = q
			? pssList.filter((p) => p.name.toLowerCase().includes(q))
			: pssList;
		return list.slice(0, 100);
	}, [pssList, pssQuery]);

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
		if (!file.name.toLowerCase().endsWith('.msg')) {
			setError('Please upload a .msg email file');
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
			subject: subjectParts[0] || 'New Query',
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
			// Require the original client email (.msg) for every new query
			if (!attachment) {
				setError('Please attach the client email (.msg) before saving the query.');
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
				throw new Error(body.error || 'Failed to create query');
			}
			setMessage('Query created successfully');
		} catch (err: any) {
			setError(err.message || 'Failed to create query');
		} finally {
			setSubmitting(false);
		}
	};

		if (!user) {
			return (
				<Layout>
					<div className="space-y-4">
						<h2 className="text-2xl font-semibold text-slate-900">Queries</h2>
						<p className="text-sm text-slate-500">Please sign in to add a query.</p>
					</div>
				</Layout>
			);
		}

		if (!canAddQuery) {
			return (
				<Layout>
					<div className="space-y-4">
						<h2 className="text-2xl font-semibold text-slate-900">Queries</h2>
						<p className="text-sm text-slate-500">You are not authorized to add queries.</p>
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
							<div ref={pssBoxRef} className="relative">
								<label className="block text-sm font-medium text-slate-700" htmlFor="pss">
									PSS
								</label>
								<input
									id="pss"
									type="text"
									autoComplete="off"
									value={pssQuery}
									placeholder={loadingLookups ? 'Loading PSS list…' : 'Search PSS by name'}
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
											const pick = filteredPss[pssHighlight];
											if (pick) selectPss(pick);
										} else if (e.key === 'Escape') {
											setPssOpen(false);
										}
									}}
									disabled={loadingLookups}
									className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500 disabled:bg-slate-50"
								/>
								{pssOpen && filteredPss.length > 0 && (
									<ul className="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-md border border-slate-200 bg-white py-1 text-sm shadow-lg">
										{filteredPss.map((p, idx) => (
											<li
												key={p.id}
												onMouseDown={(e) => {
													e.preventDefault();
													selectPss(p);
												}}
												onMouseEnter={() => setPssHighlight(idx)}
												className={`cursor-pointer px-3 py-1.5 ${
													idx === pssHighlight ? 'bg-teal-50 text-teal-800' : 'text-slate-700 hover:bg-slate-50'
												}`}
											>
												<div className="font-medium">{p.name}</div>
												<div className="text-[11px] text-slate-500">
													{[p.state, p.capacityMw != null ? `${p.capacityMw} MW` : null, p.type, p.transmissionType]
														.filter(Boolean)
														.join(' · ')}
												</div>
											</li>
										))}
									</ul>
								)}
								{pssOpen && !loadingLookups && filteredPss.length === 0 && (
									<div className="absolute z-20 mt-1 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-xs text-slate-500 shadow-lg">
										No PSS matches. Ask a manager to add it in Admin.
									</div>
								)}
								<p className="mt-1 text-[11px] text-slate-500">
									Type to search. Selecting auto-fills State, Capacity, Technology, Transmission Type.
								</p>
							</div>
							<div>
								<label className="block text-sm font-medium text-slate-700" htmlFor="clientName">
									Client Name
								</label>
								<input
									id="clientName"
									name="clientName"
									type="text"
									value={form.clientName}
									onChange={handleChange}
									className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
									placeholder="Enter client name"
								/>
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
								{submitting ? 'Saving...' : 'Save Query'}
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
							<h3 className="text-sm font-semibold text-slate-900">Attach email (.msg)</h3>
							<p className="mt-1 text-xs text-slate-500">
								Drag and drop the Outlook email (.msg) related to this query, or click to browse.
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
								{attachment ? attachment.fileName : 'Drop .msg file here or click to upload'}
							</p>
							<p className="mt-1 text-[11px] text-slate-500">Only .msg files are supported.</p>
							<input
								ref={fileInputRef}
								type="file"
								accept=".msg"
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
