import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { AuthUser } from '@codemind/shared';
import {
  authRequest,
  refreshAuthSession,
  setAccessToken,
  subscribeToSessionExpiration,
} from '../lib/authSession';

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  restoreError: string | null;
  login(email: string, password: string): Promise<void>;
  register(email: string, password: string): Promise<void>;
  logout(): Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [restoreError, setRestoreError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const unsubscribe = subscribeToSessionExpiration(() => setUser(null));
    refreshAuthSession()
      .then((session) => {
        if (active) setUser(session?.user ?? null);
      })
      .catch(() => {
        if (active) {
          setUser(null);
          setRestoreError('Could not restore your session. Please sign in again.');
        }
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isLoading,
      restoreError,
      async login(email, password) {
        const session = await authRequest('/login', { email, password });
        if (!('accessToken' in session)) throw new Error('Invalid login response');
        setAccessToken(session.accessToken);
        setUser(session.user);
        setRestoreError(null);
      },
      async register(email, password) {
        const session = await authRequest('/register', { email, password });
        if (!('accessToken' in session)) throw new Error('Invalid registration response');
        setAccessToken(session.accessToken);
        setUser(session.user);
        setRestoreError(null);
      },
      async logout() {
        await authRequest('/logout');
        setAccessToken(null);
        setUser(null);
      },
    }),
    [user, isLoading, restoreError],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
