import Link from 'next/link';
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../pages/_app';
import { getDefaultQueriesRoute } from '../lib/auth/roles';
import NotificationBell from './NotificationBell';

// Inline SVG Icon components to ensure zero external dependency issues
const IconDashboard = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"></path>
  </svg>
);

const IconQueries = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path>
  </svg>
);

const IconAdmin = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path>
  </svg>
);

const IconChevronLeft = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"></path>
  </svg>
);

const IconChevronRight = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"></path>
  </svg>
);

const IconLogout = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path>
  </svg>
);

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, setUser, initialized } = useAuth();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const role = user?.role;
  const canViewQueries = role && ['ADMIN', 'MANAGER', 'KAM'].includes(role);
  const canViewAdmin = role === 'ADMIN';
  const queriesHref = role ? getDefaultQueriesRoute(role) : '/queries/assign';

  const getPageHeader = () => {
    const path = router.pathname;
    if (path.startsWith('/admin')) {
      return {
        title: 'Admin',
        subtitle: 'Inspect permissions, see database tables, and manage roles, users, clients, and PSS mappings.',
      };
    }
    if (path === '/queries/new') {
      return {
        title: 'Tickets',
        subtitle: 'Create a new technical ticket.',
      };
    }
    if (path === '/queries/all') {
      return {
        title: 'All Tickets',
        subtitle: 'All technical tickets across clients, regardless of raiser or assignee.',
      };
    }
    if (path === '/queries/assign') {
      return {
        title: 'Respond to Tickets',
        subtitle: 'Active tickets awaiting a reply. Any authorized team member can reply — the first reply resolves the ticket and notifies the creator.',
      };
    }
    if (path === '/queries/replies-inbox') {
      const inboxScope = router.query.scope === 'my' ? 'my' : 'all';
      return {
        title: inboxScope === 'my' ? 'My Tickets' : 'All Tickets',
        subtitle:
          inboxScope === 'my'
            ? 'Tickets you created that have received a reply or been marked resolved.'
            : 'All tickets that have received a reply or been marked resolved.',
      };
    }
    if (path === '/queries/reply') {
      return {
        title: 'Respond to Ticket',
        subtitle: 'Review ticket details and compose a response.',
      };
    }
    if (path === '/queries/reply-history') {
      return {
        title: 'Ticket Responses',
        subtitle: 'View sent replies and previous communications for this ticket.',
      };
    }
    if (path === '/queries/today-solved') {
      return {
        title: 'Resolved Tickets',
        subtitle: 'All resolved tickets with filters.',
      };
    }
    if (path === '/dashboard') {
      return {
        title: 'Dashboard',
        subtitle: 'Overview of technical tickets: volumes, status mix, team performance, and state-wise analysis.',
      };
    }
    return null;
  };

  const headerInfo = getPageHeader();

  useEffect(() => {
    if (initialized && !user && router.pathname !== '/login') {
      router.replace('/login');
    }
  }, [user, initialized, router]);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {
      // ignore, fallback to client-side logout
    }
    setUser(null);
    setMenuOpen(false);
    router.push('/login');
  };

  if (!initialized) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-slate-50">
        <svg className="animate-spin h-8 w-8 text-teal-600" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      </div>
    );
  }

  if (!user) {
    return <div className="min-h-screen bg-slate-50">{children}</div>;
  }

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* SIDEBAR */}
      <aside 
        className={`fixed left-0 top-0 h-screen bg-white border-r border-slate-200 flex flex-col z-50 transition-all duration-300 ease-in-out ${
          collapsed ? 'w-20' : 'w-64'
        }`}
      >
        {/* Toggle Button */}
        <button
          type="button"
          onClick={() => setCollapsed(!collapsed)}
          className="absolute top-6 -right-3 w-6 h-6 bg-teal-600 text-white rounded-full flex items-center justify-center shadow-md hover:scale-110 active:scale-95 transition-all z-[100]"
        >
          {collapsed ? <IconChevronRight /> : <IconChevronLeft />}
        </button>

        {/* Logo / Header */}
        <div className="p-4 border-b border-slate-100 flex flex-col items-center gap-2 overflow-hidden w-full text-center">
          <div className="flex items-center justify-center w-full">
            <img 
              src="/mrllogo.png" 
              alt="MRL Logo" 
              className={`object-contain rounded-md transition-all ${
                collapsed ? 'h-8 w-8 min-w-[32px]' : 'h-10 w-auto max-w-[180px]'
              }`}
              onError={(e) => {
                e.currentTarget.style.display = 'none';
                const fallback = e.currentTarget.nextSibling as HTMLElement;
                if (fallback) fallback.style.display = 'flex';
              }}
            />
            <div className="hidden flex h-8 w-8 min-w-[32px] items-center justify-center rounded-md bg-teal-600 text-[10px] font-semibold text-white">
              CRM
            </div>
          </div>
          {!collapsed && (
            <div className="mt-2 w-full text-center">
              <span className="text-[16px] font-bold uppercase tracking-wider text-slate-900">
                CRM PORTAL
              </span>
            </div>
          )}
        </div>

        {/* Nav Links */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          <Link
            href="/dashboard"
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              router.pathname === '/dashboard'
                ? 'bg-teal-50 text-teal-700'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            <span className={router.pathname === '/dashboard' ? 'text-teal-700' : 'text-slate-400'}>
              <IconDashboard />
            </span>
            {!collapsed && <span className="truncate">Dashboard</span>}
          </Link>

          {canViewQueries && (
            <Link
              href={queriesHref}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                router.pathname.startsWith('/queries')
                  ? 'bg-teal-50 text-teal-700'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <span className={router.pathname.startsWith('/queries') ? 'text-teal-700' : 'text-slate-400'}>
                <IconQueries />
              </span>
              {!collapsed && <span className="truncate">Tickets</span>}
            </Link>
          )}

          {canViewAdmin && (
            <Link
              href="/admin"
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                router.pathname.startsWith('/admin')
                  ? 'bg-teal-50 text-teal-700'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <span className={router.pathname.startsWith('/admin') ? 'text-teal-700' : 'text-slate-400'}>
                <IconAdmin />
              </span>
              {!collapsed && <span className="truncate">Admin Console</span>}
            </Link>
          )}
        </nav>

      </aside>

      {/* CONTENT AREA */}
      <div 
        className={`flex-1 flex flex-col min-h-screen transition-all duration-300 ${
          collapsed ? 'pl-20' : 'pl-64'
        }`}
      >
        {/* Top Header */}
        <header className="sticky top-0 bg-white border-b border-slate-200 min-h-16 py-2.5 flex items-center justify-between px-6 z-30">
          <div className="flex flex-col min-w-0">
            {headerInfo ? (
              <>
                <h1 className="text-base font-bold text-slate-800 flex items-center gap-2">
                  <span>{headerInfo.title}</span>
                  <span className="text-[9px] font-bold uppercase tracking-widest text-teal-600 border border-teal-200 rounded px-1.5 py-0.5 bg-teal-50">
                    CRM Portal
                  </span>
                </h1>
                <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">{headerInfo.subtitle}</p>
              </>
            ) : (
              <span className="text-[10px] font-bold uppercase tracking-widest text-teal-600">
                CRM Portal
              </span>
            )}
          </div>
          <div className="flex items-center gap-4 flex-shrink-0">
            <NotificationBell />
            
            <div className="h-6 w-[1px] bg-slate-200"></div>

            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-teal-600 text-xs font-semibold text-white">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex flex-col leading-none text-left">
                <span className="font-semibold text-slate-800 text-xs">{user.name}</span>
                <span className="text-[9px] uppercase tracking-wider text-slate-500 font-bold mt-0.5">
                  {user.role}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleLogout}
              title="Log Out"
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded border border-slate-200 text-xs text-slate-600 bg-white hover:bg-red-50 hover:text-red-600 transition-colors"
            >
              <IconLogout />
              <span>Log Out</span>
            </button>
          </div>
        </header>

        {/* Content body */}
        <main className="flex-1 p-6 max-w-6xl w-full mx-auto space-y-6">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;
