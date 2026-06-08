import Link from 'next/link';
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../pages/_app';

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, setUser } = useAuth();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (!user && router.pathname !== '/login') {
      router.replace('/login');
    }
  }, [user, router]);

  const isAuthenticated = !!user;

  const handleLogout = () => {
    setUser(null);
    setMenuOpen(false);
    router.push('/login');
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-teal-600 text-xs font-semibold text-white">
              CRM
            </div>
            <div>
              <h1 className="text-base font-semibold text-slate-900 sm:text-lg">
                CRM Portal
              </h1>
              <p className="hidden text-xs text-slate-500 sm:block">
                Manage client queries and analytics
              </p>
            </div>
          </div>
          <nav className="flex items-center gap-3 text-sm font-medium text-slate-600">
            {isAuthenticated && (
              <>
                <Link
                  href="/dashboard"
                  className="rounded px-2 py-1 hover:bg-slate-100 hover:text-teal-700"
                >
                  Dashboard
                </Link>
                <Link
                  href="/queries"
                  className="rounded px-2 py-1 hover:bg-slate-100 hover:text-teal-700"
                >
                  Queries
                </Link>
                <Link
                  href="/admin"
                  className="rounded px-2 py-1 hover:bg-slate-100 hover:text-teal-700"
                >
                  Admin
                </Link>
              </>
            )}
          </nav>
          <div className="flex items-center gap-3">
            {user ? (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setMenuOpen((open) => !open)}
                  className="flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs sm:text-sm hover:bg-slate-200"
                >
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-teal-600 text-xs font-semibold text-white">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="hidden flex-col leading-tight sm:flex">
                    <span className="font-medium text-slate-900">{user.name}</span>
                    <span className="text-[11px] uppercase tracking-wide text-slate-500">
                      {user.role}
                    </span>
                  </div>
                </button>
                {menuOpen && (
                  <div className="absolute right-0 z-10 mt-2 w-32 rounded-md border border-slate-200 bg-white py-1 text-sm shadow-lg">
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="block w-full px-3 py-1.5 text-left text-slate-700 hover:bg-slate-50"
                    >
                      Logout
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link
                href="/login"
                className="rounded-md bg-teal-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-teal-700 sm:text-sm"
              >
                Login
              </Link>
            )}
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </div>
  );
};

export default Layout;

