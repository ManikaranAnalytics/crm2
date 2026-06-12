/** DB stores resolved queries as CLOSED; UI displays as DONE / Resolved. */
export function formatQueryStatus(status: string): string {
  if (status === 'CLOSED') return 'DONE';
  return status.replace(/_/g, ' ');
}

export function isQueryResolved(status: string): boolean {
  return status === 'CLOSED';
}

export function isQueryActive(status: string): boolean {
  return status !== 'CLOSED';
}

export function statusBadgeClass(status: string): string {
  if (status === 'CLOSED') return 'bg-emerald-100 text-emerald-800';
  if (status === 'IN_PROGRESS') return 'bg-amber-100 text-amber-800';
  if (status === 'OPEN') return 'bg-sky-100 text-sky-800';
  if (status === 'PENDING_FROM_CLIENT') return 'bg-violet-100 text-violet-800';
  return 'bg-slate-100 text-slate-700';
}
