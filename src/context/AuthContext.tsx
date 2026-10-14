import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

const AUTH_STORAGE_KEY = 'barcode_inventory_auth';
const MASTER_PASSWORD_STORAGE_KEY = 'barcode_inventory_master_password';

interface AuthContextValue {
  isAuthenticated: boolean;
  login: (password: string) => boolean;
  logout: () => void;
  getMasterPassword: () => string;
  setMasterPassword: (password: string) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function getStoredAuth(): boolean {
  return localStorage.getItem(AUTH_STORAGE_KEY) === 'true';
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(getStoredAuth);
  const [masterPasswordOverride, setMasterPasswordOverride] = useState<string | null>(null);

  const getMasterPassword = useCallback((): string => {
    return masterPasswordOverride ?? localStorage.getItem(MASTER_PASSWORD_STORAGE_KEY) ?? import.meta.env.VITE_MASTER_PASSWORD ?? '';
  }, [masterPasswordOverride]);

  const login = useCallback((password: string): boolean => {
    const correctPassword = masterPasswordOverride ?? import.meta.env.VITE_MASTER_PASSWORD ?? '';
    if (password === correctPassword) {
      localStorage.setItem(AUTH_STORAGE_KEY, 'true');
      setIsAuthenticated(true);
      return true;
    }
    return false;
  }, [masterPasswordOverride]);

  const logout = useCallback((): void => {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    setIsAuthenticated(false);
  }, []);

  const setMasterPassword = useCallback((password: string): void => {
    localStorage.setItem(MASTER_PASSWORD_STORAGE_KEY, password);
    setMasterPasswordOverride(password);
  }, []);

  return (
    <AuthContext.Provider
      value={{ isAuthenticated, login, logout, getMasterPassword, setMasterPassword }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
