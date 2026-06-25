import Link from 'next/link';
import { useRouter } from 'next/router';
import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../pages/_app';

type TabKey = 'ADD' | 'ASSIGN' | 'MY' | 'ALL' | 'REPLIES';

interface QueryTabsProps {
  active: TabKey;
}

const tabBase =
  'inline-flex items-center px-1 py-3 text-sm font-medium transition-colors duration-150';

const QueryTabs: React.FC<QueryTabsProps> = ({ active }) => {
  const { user } = useAuth();
  const router = useRouter();
  const role = user?.role;
  const [repliesOpen, setRepliesOpen] = useState(false);
  const repliesRef = useRef<HTMLDivElement>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const canAddQuery = role && ['ADMIN', 'MANAGER', 'KAM'].includes(role);
  const canReply = role && ['ADMIN', 'MANAGER'].includes(role);
  const canViewReplies = role && ['ADMIN', 'MANAGER', 'KAM'].includes(role);
  const canViewAll = role === 'ADMIN';

  const repliesScope = router.query.scope === 'my' ? 'my' : 'all';
  const isRepliesActive = active === 'REPLIES';

  const openDropdown = () => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
    setRepliesOpen(true);
  };

  const scheduleClose = () => {
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    closeTimerRef.current = setTimeout(() => setRepliesOpen(false), 180);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (repliesRef.current && !repliesRef.current.contains(event.target as Node)) {
        if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
        setRepliesOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    };
  }, []);

  const tabClass = (key: TabKey) =>
    active === key
      ? 'border-teal-600 text-teal-700 border-b-[3px]'
      : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700 border-b-2';

  const repliesTabClass = isRepliesActive
    ? 'border-teal-600 text-teal-700 border-b-[3px]'
    : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700 border-b-2';

  return (
    <div className="border-b border-slate-200 bg-white">
      <nav className="-mb-px flex gap-6 px-1" aria-label="Query sections">
        {canAddQuery && (
          <Link href="/queries/new" className={`${tabBase} ${tabClass('ADD')}`}>
            Add Query
          </Link>
        )}
        {canReply && (
          <Link href="/queries/assign" className={`${tabBase} ${tabClass('ASSIGN')}`}>
            Reply to Queries
          </Link>
        )}
        {canViewReplies && (
          <div
            ref={repliesRef}
            className="relative"
            onMouseEnter={openDropdown}
            onMouseLeave={scheduleClose}
          >
            <button
              type="button"
              onClick={() => setRepliesOpen((open) => !open)}
              className={`${tabBase} ${repliesTabClass} gap-1`}
              aria-expanded={repliesOpen}
              aria-haspopup="true"
            >
              Query Replies
              <svg
                className={`h-4 w-4 transition-transform ${repliesOpen ? 'rotate-180' : ''}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {repliesOpen && (
              <div
                className="absolute left-0 top-full z-30 w-52 pt-1"
                onMouseEnter={openDropdown}
                onMouseLeave={scheduleClose}
              >
                <div className="overflow-hidden rounded-lg border border-slate-200 bg-white py-1 shadow-lg ring-1 ring-black/5">
                  <Link
                    href="/queries/replies-inbox?scope=my"
                    className={`block px-4 py-2.5 text-sm transition-colors hover:bg-teal-50 ${
                      isRepliesActive && repliesScope === 'my'
                        ? 'bg-teal-50/80 font-semibold text-teal-700'
                        : 'text-slate-700'
                    }`}
                    onClick={() => setRepliesOpen(false)}
                  >
                    My Query Replies
                  </Link>
                  <Link
                    href="/queries/replies-inbox?scope=all"
                    className={`block px-4 py-2.5 text-sm transition-colors hover:bg-teal-50 ${
                      isRepliesActive && repliesScope === 'all'
                        ? 'bg-teal-50/80 font-semibold text-teal-700'
                        : 'text-slate-700'
                    }`}
                    onClick={() => setRepliesOpen(false)}
                  >
                    All Query Replies
                  </Link>
                </div>
              </div>
            )}
          </div>
        )}
        {canViewAll && (
          <Link href="/queries/all" className={`${tabBase} ${tabClass('ALL')}`}>
            All Queries (Admin)
          </Link>
        )}
      </nav>
    </div>
  );
};

export default QueryTabs;
