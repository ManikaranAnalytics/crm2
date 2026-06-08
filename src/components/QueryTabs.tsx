import Link from 'next/link';
import { useAuth } from '../pages/_app';

type TabKey = 'ADD' | 'ASSIGN' | 'MY' | 'ALL';

interface QueryTabsProps {
	active: TabKey;
}

const QueryTabs: React.FC<QueryTabsProps> = ({ active }) => {
		const { user } = useAuth();
			const canAssign = !!user && (user.email === 'himanshu.s@manikarananalytics.in' || user.role === 'ADMIN');
			const canViewAll = !!user && user.role === 'ADMIN';

	return (
		<div className="border-b border-slate-200 bg-white">
			<nav className="-mb-px flex gap-6 px-1" aria-label="Query sections">
				<Link
					href="/queries/new"
					className={
						(active === 'ADD'
							? 'border-teal-600 text-teal-700'
							: 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700') +
						' inline-flex items-center border-b-2 px-1 py-3 text-sm font-medium'
					}
				>
					Add Query
				</Link>
					{canAssign && (
					<Link
						href="/queries/assign"
						className={
							(active === 'ASSIGN'
								? 'border-teal-600 text-teal-700'
								: 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700') +
							' inline-flex items-center border-b-2 px-1 py-3 text-sm font-medium'
						}
					>
						Assign Query
					</Link>
				)}
				<Link
					href="/queries"
					className={
						(active === 'MY'
							? 'border-teal-600 text-teal-700'
							: 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700') +
						' inline-flex items-center border-b-2 px-1 py-3 text-sm font-medium'
					}
				>
					My Queries
				</Link>
					{canViewAll && (
						<Link
							href="/queries/all"
							className={
								(active === 'ALL'
									? 'border-teal-600 text-teal-700'
									: 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700') +
								' inline-flex items-center border-b-2 px-1 py-3 text-sm font-medium'
							}
						>
							All Queries (Admin)
						</Link>
					)}
			</nav>
		</div>
	);
};

export default QueryTabs;
