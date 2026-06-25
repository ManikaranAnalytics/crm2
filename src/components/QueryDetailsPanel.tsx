import React from 'react';
import type { QueryThread } from '../services/queryService';

export interface QueryDetailsPanelProps {
  thread: QueryThread;
  /** Compact layout for modal contexts */
  compact?: boolean;
}

const dash = (value: string | number | null | undefined): string => {
  if (value === null || value === undefined || value === '') return '—';
  return String(value);
};

interface FieldItem {
  label: string;
  value: string;
  highlight?: boolean;
  fullWidth?: boolean;
}

const QueryDetailsPanel: React.FC<QueryDetailsPanelProps> = ({
  thread,
  compact = false,
}) => {
  const fields: FieldItem[] = [
    { label: 'PSS', value: dash(thread.pssText) },
    { label: 'Client Name', value: dash(thread.clientName) },
    { label: 'State', value: dash(thread.state) },
    {
      label: 'Capacity (MW)',
      value:
        thread.capacityMw != null && thread.capacityMw !== 0
          ? dash(thread.capacityMw)
          : '—',
    },
    { label: 'Technology', value: dash(thread.technology) },
    { label: 'Transmission Type (STU / CTU)', value: dash(thread.transmissionType) },
    { label: 'Issue Period', value: dash(thread.periodOfIssue), fullWidth: true },
    { label: 'Issue', value: dash(thread.issue), highlight: true, fullWidth: true },
  ];

  const cellPad = compact ? 'px-3 py-2.5' : 'px-4 py-3';

  return (
    <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="bg-[#0f766e] px-4 py-2.5">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-white">
          Ticket Information
        </h2>
      </div>
      <dl className="grid grid-cols-1 gap-px bg-slate-100 sm:grid-cols-2">
        {fields.map((field) => (
          <div
            key={field.label}
            className={`bg-white ${cellPad} ${field.fullWidth ? 'sm:col-span-2' : ''}`}
          >
            <dt className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              {field.label}
            </dt>
            <dd className="mt-1 text-sm font-semibold text-slate-800">
              {field.highlight && field.value !== '—' ? (
                <span className="inline-flex rounded-full bg-teal-50 px-2.5 py-0.5 text-xs font-semibold text-teal-700 ring-1 ring-teal-100">
                  {field.value}
                </span>
              ) : (
                field.value
              )}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
};

export default QueryDetailsPanel;
