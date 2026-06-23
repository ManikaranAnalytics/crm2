import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Layout from '../components/Layout';
import { useAuth } from './_app';

const LoginPage: React.FC = () => {
  const router = useRouter();
  const { user, setUser, initialized } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (initialized && user) {
      router.replace('/dashboard');
    }
  }, [user, initialized, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || 'Login failed');
      }
      const data = await res.json();
      setUser(data.user);
      document.cookie = "crm_session=" + encodeURIComponent(JSON.stringify(data.user)) + "; path=/; max-age=86400; SameSite=Lax";
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="relative min-h-screen">
        <div
          className="absolute inset-0 bg-[url('/images/bg.png')] bg-cover bg-center bg-no-repeat"
          aria-hidden="true"
        />
        <div className="absolute inset-0 bg-slate-900/45" aria-hidden="true" />
        <div className="relative z-10 flex min-h-screen flex-col items-center justify-center p-6">
        
        {/* Logo and Brand Header */}
        <div className="mb-8 flex flex-col items-center gap-2">
          <img src="/mrllogo.png" alt="Logo" className="h-16 object-contain" />
          <span className="text-[10px] font-bold uppercase tracking-[0.24em] text-teal-600">
            CRM Portal
          </span>
        </div>

        {/* Login Card */}
        <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-xl transition-all duration-300">
          <div className="text-center">
            <h2 className="text-2xl font-bold tracking-tight text-slate-800">Sign In</h2>
            <p className="mt-2 text-xs text-slate-400 font-medium">
              Access your personalized CRM workspace dashboard.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5" htmlFor="email">
                Work Email
              </label>
              <input
                id="email"
                type="email"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm shadow-sm transition-all focus:border-teal-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-teal-500"
              />
            </div>
            
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5" htmlFor="password">
                Password
              </label>
              <input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm shadow-sm transition-all focus:border-teal-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-teal-500"
              />
            </div>

            {error && (
              <div className="rounded-lg bg-red-50 border border-red-100 p-3 text-xs text-red-600 font-medium">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center rounded-lg bg-teal-600 hover:bg-teal-700 text-white py-2.5 text-sm font-semibold shadow-md active:scale-[0.98] transition-all disabled:cursor-not-allowed disabled:opacity-70"
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span>Logging in...</span>
                </div>
              ) : (
                'Login'
              )}
            </button>
          </form>
        </div>

        </div>
      </div>
    </Layout>
  );
};

export default LoginPage;

