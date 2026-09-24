import { createContext, useContext, useCallback, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import type { AuthStatus, AuthUser } from '@/services/authService';
import {
  loginWithDashboard,
  validateToken,
  getStoredToken,
  storeToken,
  clearToken,
  trackDeviceWithDashboard,
} from '@/services/authService';

interface AuthContextValue {
  status: AuthStatus;
  user: AuthUser | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [user, setUser] = useState<AuthUser | null>(null);

  // Validate stored token on mount
  useEffect(() => {
    const token = getStoredToken();
    if (!token) {
      setStatus('unauthenticated');
      return;
    }

    validateToken(token)
      .then((result) => {
        if (result.valid && result.user) {
          setUser(result.user);
          if (result.user.status === 'pending') {
            setStatus('pending');
          } else if (result.user.status === 'locked') {
            setStatus('locked');
          } else {
            setStatus('active');
            // Track device on returning visit (non-blocking)
            trackDeviceWithDashboard(token).catch(() => {});
          }
        } else {
          clearToken();
          setStatus('unauthenticated');
        }
      })
      .catch(() => {
        clearToken();
        setStatus('unauthenticated');
      });
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    setStatus('loading');
    try {
      const response = await loginWithDashboard(email, password);
      storeToken(response.token);
      setUser(response.user);

      if (response.user.status === 'pending') {
        setStatus('pending');
      } else if (response.user.status === 'locked') {
        setStatus('locked');
      } else {
        setStatus('active');
        // Track device with dashboard (non-blocking)
        trackDeviceWithDashboard(response.token).catch(() => {});
      }
    } catch (err) {
      clearToken();
      setUser(null);
      setStatus('unauthenticated');
      throw err; // re-throw so LoginScreen can display the error
    }
  }, []);

  const logout = useCallback(() => {
    clearToken();
    setUser(null);
    setStatus('unauthenticated');
  }, []);

  return (
    <AuthContext.Provider value={{ status, user, login, logout, isLoading: status === 'loading' }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
