import type { AppProps } from 'next/app';
import React, { createContext, useContext, useState, useEffect } from 'react';
import '../styles.css';

export type RoleName = 'ADMIN' | 'MANAGER' | 'KAM';

export interface UserSession {
  id: number;
  email: string;
  name: string;
  role: RoleName;
  rank: number;
}

interface AuthContextValue {
  user: UserSession | null;
  setUser: (user: UserSession | null) => void;
  initialized: boolean;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const useAuth = (): AuthContextValue => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
};

const STORAGE_KEY = 'crm.session.user';

export function getStoredActorId(): number | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as UserSession;
    return parsed?.id ?? null;
  } catch {
    return null;
  }
}

export function authHeaders(extra?: Record<string, string>): Record<string, string> {
  const id = getStoredActorId();
  const headers: Record<string, string> = { ...(extra || {}) };
  if (id) headers['x-actor-id'] = String(id);
  return headers;
}

const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUserState] = useState<UserSession | null>(null);
  const [initialized, setInitialized] = useState(false);

  const getCookie = (name: string) =>
    document.cookie.split('; ').find(r => r.startsWith(name + '='))?.split('=')[1];

  const setUser = (u: UserSession | null) => {
    setUserState(u);
    if (typeof window === 'undefined') return;
    try {
      if (u) {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(u));
      } else {
        window.localStorage.removeItem(STORAGE_KEY);
        document.cookie = "crm_session=; path=/; max-age=0";
      }
    } catch {
      /* ignore */
    }
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const raw = getCookie('crm_session');
    if (raw) {
      try {
        const parsed = JSON.parse(decodeURIComponent(raw));
        setUserState(parsed);
      } catch {}
    } else {
      try {
        const stored = window.localStorage.getItem(STORAGE_KEY);
        if (stored) {
          setUserState(JSON.parse(stored) as UserSession);
        }
      } catch {
        /* ignore */
      }
    }
    setInitialized(true);
  }, []);

  return (
    <AuthContext.Provider value={{ user, setUser, initialized }}>
      {children}
    </AuthContext.Provider>
  );
};

const App = ({ Component, pageProps }: AppProps) => {
  return (
    <AuthProvider>
      <Component {...pageProps} />
    </AuthProvider>
  );
};

export default App;

