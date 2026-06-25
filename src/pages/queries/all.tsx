import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import Layout from '../../components/Layout';
import QueryTabs from '../../components/QueryTabs';
import { getRepliesInboxRoute } from '../../lib/auth/roles';
import { EMAIL_FILE_ACCEPT, isEmailFileName } from '../../lib/email/emailFileValidation';
import { useAuth } from '../_app';

interface QuerySummary {
  id: number;
  queryCode: string;
  clientName?: string;
  state?: string;
  pss?: string;
	  transmissionType?: string;
	  periodOfIssue?: string;
  status: string;
  responsibilityTo?: string;
  queryAssignDate?: string;
}

interface MsgAttachmentPayload {
  fileName: string;
  dataBase64: string;
  contentType: string;
}

const EDITABLE_STATUS_OPTIONS = [
  { value: 'OPEN', label: 'Raised' },
  { value: 'IN_PROGRESS', label: 'Pending' },
  { value: 'CLOSED', label: 'Solved' },
  { value: 'PENDING_FROM_CLIENT', label: 'Pending from Client' },
];

const getStatusLabel = (status: string): string => {
  const found = EDITABLE_STATUS_OPTIONS.find((opt) => opt.value === status);
  return found ? found.label : status;
};

const AllQueriesPage: React.FC = () => {
  const { user } = useAuth();
  const router = useRouter();
  const [queries, setQueries] = useState<QuerySummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [closingQueryId, setClosingQueryId] = useState<number | null>(null);
  const [solutionAttachment, setSolutionAttachment] = useState<MsgAttachmentPayload | null>(null);
  const [solutionDocAttachment, setSolutionDocAttachment] = useState<MsgAttachmentPayload | null>(null);
  const [solutionRemark, setSolutionRemark] = useState('');
  const [closingError, setClosingError] = useState<string | null>(null);
  const [closingSubmitting, setClosingSubmitting] = useState(false);
  const closeFileInputRef = useRef<HTMLInputElement | null>(null);
  const closeDocFileInputRef = useRef<HTMLInputElement | null>(null);

  const isAdmin = !!user && user.role === 'ADMIN';
  const isKam = !!user && user.role === 'KAM';
  const hasAccess = isAdmin || isKam;

  useEffect(() => {
    if (user?.role === 'KAM') {
      router.replace(getRepliesInboxRoute());
    }
  }, [user, router]);

  useEffect(() => {
    if (!user || !hasAccess) return;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/queries?scope=all&userId=${user.id}`);
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || 'Failed to load queries');
        }
        const data = await res.json();
        setQueries(data.queries || []);
      } catch (err: any) {
        setError(err.message || 'Failed to load queries');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user, hasAccess]);

  const handleStatusChange = async (queryId: number, newStatus: string) => {
    if (!user) {
      setError('You must be logged in to update query status');
      return;
    }
    // Closing requires an attached solution .msg via the close panel
    if (newStatus === 'CLOSED') {
      setClosingQueryId(queryId);
      setSolutionAttachment(null);
      setSolutionDocAttachment(null);
      setSolutionRemark('');
      setClosingError(null);
      return;
    }

    setUpdatingId(queryId);
    setError(null);
    try {
      const res = await fetch('/api/queries/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: queryId, status: newStatus, requestedById: user.id }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || 'Failed to update query status');
      }
      const body = await res.json();
      const updatedStatus: string = body.query?.status || newStatus;
      setQueries((prev) => prev.map((q) => (q.id === queryId ? { ...q, status: updatedStatus } : q)));
    } catch (err: any) {
      setError(err.message || 'Failed to update query status');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleSolutionFile = (file: File | null) => {
    if (!file) return;
    if (!isEmailFileName(file.name)) {
      setClosingError('Please upload a .msg or .eml email file');
      return;
    }
    setClosingError(null);
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result === 'string') {
        const base64 = result.includes(',') ? result.split(',')[1] : result;
        setSolutionAttachment({
          fileName: file.name,
          dataBase64: base64,
          contentType: file.type || 'application/octet-stream',
        });
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSolutionDocFile = (file: File | null) => {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.docx')) {
      setClosingError('Please upload a .docx file for the solution document');
      return;
    }
    setClosingError(null);
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result === 'string') {
        const base64 = result.includes(',') ? result.split(',')[1] : result;
        setSolutionDocAttachment({
          fileName: file.name,
          dataBase64: base64,
          contentType:
            file.type ||
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        });
      }
    };
    reader.readAsDataURL(file);
  };

  const cancelCloseDialog = () => {
    setClosingQueryId(null);
    setSolutionAttachment(null);
    setSolutionDocAttachment(null);
    setSolutionRemark('');
    setClosingError(null);
  };

  const handleSubmitClose = async () => {
    if (!user) {
      setClosingError('You must be logged in to close a query');
      return;
    }
    if (!closingQueryId) return;
    if (!solutionAttachment) {
      setClosingError('Please attach the solution email (.msg or .eml) to request closure.');
      return;
    }

    setClosingSubmitting(true);
    setClosingError(null);
    try {
      const res = await fetch('/api/queries/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: closingQueryId,
          status: 'CLOSED',
          requestedById: user.id,
          attachment: solutionAttachment,
          docAttachment: solutionDocAttachment,
          remark: solutionRemark,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || 'Failed to request query closure');
      }

      const body = await res.json();
      const updatedStatus: string = body.query?.status || 'CLOSED';

      setQueries((prev) =>
        prev.map((q) => (q.id === closingQueryId ? { ...q, status: updatedStatus } : q)),
      );
      setClosingQueryId(null);
      setSolutionAttachment(null);
      setSolutionDocAttachment(null);
      setSolutionRemark('');
    } catch (err: any) {
      setClosingError(err.message || 'Failed to request query closure');
    } finally {
      setClosingSubmitting(false);
    }
  };

  if (!user) {
    return (
      <Layout>
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold text-slate-900">All Queries</h2>
          <p className="text-sm text-slate-500">Please sign in to view queries.</p>
        </div>
      </Layout>
    );
  }

  if (!hasAccess) {
    return (
      <Layout>
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold text-slate-900">All Queries</h2>
          <p className="text-sm text-slate-500">Only admin and KAM users can view all queries.</p>
        </div>
      </Layout>
    );
  }

  const closingQuery =
    closingQueryId != null ? queries.find((q) => q.id === closingQueryId) : undefined;

  return (
    <Layout>
      <div className="space-y-4">
        <QueryTabs active={isKam ? 'REPLIES' : 'ALL'} />
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          {error && (
            <p className="border-b border-slate-100 bg-red-50 px-4 py-2 text-sm text-red-700">{error}</p>
          )}
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-[#0f766e]">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-white">
                    S.No.
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-white">
                    Code
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-white">
                    Client
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-white">
                    Assigned to
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-white">
                    Assigned on
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-white">
                    State
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-white">
                    PSS
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-white">
                    Transmission
                  </th>
	                  <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-white">
	                    Issue Period
	                  </th>
                  <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-white">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
	                {loading && (
	                  <tr>
	                    <td colSpan={10} className="px-4 py-6 text-center text-sm text-slate-500">
	                      Loading queries...
	                    </td>
	                  </tr>
	                )}
	                {!loading && queries.length === 0 && !error && (
	                  <tr>
	                    <td colSpan={10} className="px-4 py-6 text-center text-sm text-slate-500">
	                      No queries found.
	                    </td>
	                  </tr>
	                )}
                {!loading &&
                  queries.map((q, index) => {
                    const isEditable = isAdmin && EDITABLE_STATUS_OPTIONS.some((opt) => opt.value === q.status);
                    return (
                      <tr key={q.id}>
                        <td className="px-4 py-2 text-slate-800">{index + 1}</td>
                        <td className="px-4 py-2 font-mono text-xs text-slate-700">{q.queryCode}</td>
                        <td className="px-4 py-2 text-slate-800">{q.clientName || '-'}</td>
                        <td className="px-4 py-2 text-slate-700">{q.responsibilityTo || '-'}</td>
                        <td className="px-4 py-2 text-slate-700">
                          {q.queryAssignDate
                            ? new Date(q.queryAssignDate).toLocaleDateString()
                            : '-'}
                        </td>
	                        <td className="px-4 py-2 text-slate-700">{q.state || '-'}</td>
	                        <td className="px-4 py-2 text-slate-700">{q.pss || '-'}</td>
	                        <td className="px-4 py-2 text-slate-700">{q.transmissionType || '-'}</td>
	                        <td className="px-4 py-2 text-slate-700">{q.periodOfIssue || '-'}</td>
	                        <td className="px-4 py-2">
                          {isEditable ? (
                            <select
                              className="block w-full rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-700 shadow-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
                              value={q.status}
                              disabled={updatingId === q.id}
                              onChange={(e) => handleStatusChange(q.id, e.target.value)}
                            >
                              {EDITABLE_STATUS_OPTIONS.map((opt) => (
                                <option key={opt.value} value={opt.value}>
                                  {opt.label}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium uppercase tracking-wide text-slate-700">
                              {getStatusLabel(q.status)}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>
        {closingQueryId && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm">
            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-slate-900">Close query</h3>
              <p className="text-xs text-slate-700">
                To request closing
                {closingQuery ? ` query ${closingQuery.queryCode}` : ' this query'}, please attach
                the solution email (.msg or .eml). This will be sent to Himanshu for approval.
              </p>
            </div>
            {closingError && (
              <p className="mt-2 rounded border border-red-100 bg-red-50 px-3 py-2 text-xs text-red-700">
                {closingError}
              </p>
            )}
            <div
              className="mt-3 flex cursor-pointer flex-col items-center justify-center rounded-md border border-dashed border-amber-300 bg-white px-4 py-6 text-center text-xs text-slate-500 hover:border-teal-400 hover:bg-teal-50"
              onClick={() => closeFileInputRef.current?.click()}
            >
              <p className="font-medium text-slate-700">
                {solutionAttachment
                  ? solutionAttachment.fileName
                  : 'Click to upload solution email (.msg or .eml)'}
              </p>
              <p className="mt-1 text-[11px] text-slate-500">Supported formats: .msg, .eml</p>
              <input
                ref={closeFileInputRef}
                type="file"
                accept={EMAIL_FILE_ACCEPT}
                className="hidden"
                onChange={(e) => handleSolutionFile(e.target.files?.[0] || null)}
              />
            </div>
            <div className="mt-4 space-y-2">
              <h4 className="text-xs font-semibold text-slate-800">
                Optional solution document (.docx) and remark
              </h4>
              <div
                className="flex cursor-pointer flex-col items-center justify-center rounded-md border border-dashed border-amber-300 bg-white px-4 py-4 text-center text-xs text-slate-500 hover:border-teal-400 hover:bg-teal-50"
                onClick={() => closeDocFileInputRef.current?.click()}
              >
                <p className="font-medium text-slate-700">
                  {solutionDocAttachment
                    ? solutionDocAttachment.fileName
                    : 'Click to upload solution document (.docx)'}
                </p>
                <p className="mt-1 text-[11px] text-slate-500">Only .docx files are supported.</p>
                <input
                  ref={closeDocFileInputRef}
                  type="file"
                  accept=".docx"
                  className="hidden"
                  onChange={(e) => handleSolutionDocFile(e.target.files?.[0] || null)}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700">
                  Solution remark (optional)
                </label>
                <textarea
                  className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-2 py-1 text-xs text-slate-800 shadow-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
                  rows={3}
                  value={solutionRemark}
                  onChange={(e) => setSolutionRemark(e.target.value)}
                  placeholder="Write a brief note about the solution..."
                />
              </div>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={cancelCloseDialog}
                className="inline-flex items-center rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                  onClick={handleSubmitClose}
                disabled={closingSubmitting}
                className="inline-flex items-center rounded-md bg-teal-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-teal-700 disabled:opacity-60"
              >
                {closingSubmitting ? 'Submitting…' : 'Send for approval'}
              </button>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default AllQueriesPage;

