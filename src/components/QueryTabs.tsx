import Link from 'next/link';
import { useAuth } from '../pages/_app';

type TabKey = 'ADD' | 'ASSIGN' | 'MY' | 'ALL' | 'TODAY' | 'REPLIES';

interface QueryTabsProps {
  active: TabKey;
}

const tabBase =
  'inline-flex items-center px-1 py-3 text-sm font-medium transition-colors duration-150';

const QueryTabs: React.FC<QueryTabsProps> = ({ active }) => {
  const { user } = useAuth();
  const role = user?.role;

  const canAddQuery = role && ['ADMIN', 'MANAGER', 'KAM'].includes(role);
  const canReply = role && ['ADMIN', 'MANAGER'].includes(role);
  const canViewToday = role && ['ADMIN', 'MANAGER', 'KAM'].includes(role);
  const canViewReplies = role && ['ADMIN', 'MANAGER', 'KAM'].includes(role);
  const canViewAll = role === 'ADMIN';

  const tabClass = (key: TabKey) =>
    active === key
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
        {/*
        <Link href="/queries" className={`${tabBase} ${tabClass('MY')}`}>
          My Queries
        </Link>
        */}
        {canViewToday && (
          <Link href="/queries/today-solved" className={`${tabBase} ${tabClass('TODAY')}`}>
            Solved Queries
          </Link>
        )}
        {canViewReplies && (
          <Link href="/queries/replies-inbox" className={`${tabBase} ${tabClass('REPLIES')}`}>
            Query Replies
          </Link>
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
