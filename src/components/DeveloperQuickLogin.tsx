import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../pages/_app';

interface DevUser {
  id: number;
  email: string;
  name: string;
  role: string;
  rank: number;
}

interface DeveloperQuickLoginProps {
  variant?: 'embedded' | 'standalone';
}

const isDevEnvironment = process.env.NODE_ENV !== 'production';

const DeveloperQuickLogin: React.FC<DeveloperQuickLoginProps> = ({ variant = 'embedded' }) => {
  const router = useRouter();
  const { setUser } = useAuth();
  const [users, setUsers] = useState<DevUser[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedUser = useMemo(
    () => users.find((u) => String(u.id) === selectedId),
    [users, selectedId],
  );

  useEffect(() => {
    if (!isDevEnvironment) return;

    const loadUsers = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch('/api/auth/dev-users');
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || 'Failed to load users');
        }
        const data = await res.json();
        const list: DevUser[] = data.users || [];
        setUsers(list);
        if (list.length > 0) {
          setSelectedId(String(list[0].id));
        }
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to load users');
      } finally {
        setLoading(false);
      }
    };

    loadUsers();
  }, []);

  const handleLogin = async () => {
    if (!selectedId) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/dev-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: Number(selectedId) }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || 'Dev login failed');
      }
      const data = await res.json();
      setUser(data.user);
      document.cookie =
        'crm_session=' + encodeURIComponent(JSON.stringify(data.user)) + '; path=/; max-age=86400; SameSite=Lax';
      router.push('/dashboard');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Dev login failed');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isDevEnvironment) {
    return null;
  }

  const isStandalone = variant === 'standalone';

  return (
    <div
      className={
        isStandalone
          ? 'w-full max-w-lg rounded-2xl border border-amber-500/30 bg-slate-900 p-8 shadow-2xl text-slate-100'
          : 'mt-6 w-full max-w-md rounded-2xl border border-dashed border-amber-300 bg-amber-50/90 p-6 shadow-lg'
      }
    >
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <h3 className={`text-sm font-bold ${isStandalone ? 'text-white' : 'text-slate-800'}`}>
          Developer Quick Login (Temporary)
        </h3>
        <span className="inline-flex rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
          Development Use Only
        </span>
      </div>
      <p className={`mb-4 text-xs ${isStandalone ? 'text-slate-400' : 'text-slate-600'}`}>
        Testing / demo login — selects a user without a password. Not available in production.
      </p>

      {error && (
        <p
          className={`mb-3 rounded-lg border px-3 py-2 text-xs ${
            isStandalone
              ? 'border-red-500/30 bg-red-950/50 text-red-300'
              : 'border-red-200 bg-red-50 text-red-700'
          }`}
        >
          {error}
        </p>
      )}

      {loading ? (
        <p className={`text-sm ${isStandalone ? 'text-slate-400' : 'text-slate-500'}`}>Loading users...</p>
      ) : users.length === 0 ? (
        <p className={`text-sm ${isStandalone ? 'text-slate-400' : 'text-slate-500'}`}>No active users found.</p>
      ) : (
        <div className="space-y-4">
          <div>
            <label
              htmlFor="dev-quick-user"
              className={`block text-[10px] font-bold uppercase tracking-wider mb-1.5 ${
                isStandalone ? 'text-slate-400' : 'text-slate-500'
              }`}
            >
              Select User
            </label>
            <select
              id="dev-quick-user"
              value={selectedId}
              onChange={(e) => setSelectedId(e.target.value)}
              className={
                isStandalone
                  ? 'w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2.5 text-sm text-white focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500'
                  : 'w-full rounded-lg border border-amber-200 bg-white px-3 py-2.5 text-sm text-slate-800 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500'
              }
            >
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.role})
                </option>
              ))}
            </select>
          </div>

          {selectedUser && (
            <div
              className={
                isStandalone
                  ? 'rounded-lg border border-slate-700 bg-slate-800/60 p-3 text-sm'
                  : 'rounded-lg border border-amber-200 bg-white p-3 text-sm'
              }
            >
              <p className={isStandalone ? 'text-slate-300' : 'text-slate-700'}>
                <span className="font-semibold">Name:</span> {selectedUser.name}
              </p>
              <p className={`mt-1 ${isStandalone ? 'text-slate-300' : 'text-slate-700'}`}>
                <span className="font-semibold">Role:</span> {selectedUser.role}
              </p>
            </div>
          )}

          <button
            type="button"
            disabled={submitting || !selectedId}
            onClick={handleLogin}
            className="w-full rounded-lg bg-amber-500 px-4 py-2.5 text-sm font-semibold text-slate-950 hover:bg-amber-400 disabled:opacity-60"
          >
            {submitting ? 'Logging in...' : 'Login As Selected User'}
          </button>
        </div>
      )}
    </div>
  );
};

export default DeveloperQuickLogin;
