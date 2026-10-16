import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import db from '@/db/dexie';

const AUTH_STORAGE_KEY = 'barcode_inventory_auth';
const SYNC_ENABLED_KEY = 'barcode_inventory_sync_enabled';
const MASTER_PASSWORD_STORAGE_KEY = 'barcode_inventory_master_password';

interface AuthContextValue {
  isAuthenticated: boolean;
  login: (password: string) => boolean;
  logout: () => void;
  getMasterPassword: () => string;
  setMasterPassword: (password: string) => void;
  syncEnabled: boolean;
  enableSync: () => void;
  disableSync: () => void;
  cloudUser: string | null;
  cloudSyncing: boolean;
  cloudLogin: (email: string, otp?: string) => Promise<void>;
  cloudLogout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function getStoredAuth(): boolean {
  return localStorage.getItem(AUTH_STORAGE_KEY) === 'true';
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(getStoredAuth);
  const [masterPasswordOverride, setMasterPasswordOverride] = useState<string | null>(null);
  const [syncEnabled, setSyncEnabled] = useState<boolean>(localStorage.getItem(SYNC_ENABLED_KEY) === 'true');
  const [cloudUser, setCloudUser] = useState<string | null>(null);
  const [cloudSyncing, setCloudSyncing] = useState<boolean>(false);

  const DEFAULT_MASTER_PASSWORD = 'Inv3ntory_M@ster_2026!';

  // Subscribe to Dexie Cloud auth + sync state
  useEffect(() => {
    const cloud = (db as any).cloud;
    if (!cloud) return;

    const userSub = cloud.currentUser?.subscribe((user: any) => {
      setCloudUser(user?.email ?? null);
    });

    const syncSub = cloud.syncState?.subscribe((state: any) => {
      setCloudSyncing(state?.phase === 'syncing');
    });

    // Check if already logged in
    cloud.currentUser?.then?.((user: any) => {
      if (user) setCloudUser(user.email ?? null);
    });

    return () => {
      userSub?.unsubscribe?.();
      syncSub?.unsubscribe?.();
    };
  }, []);

  const resolveMasterPassword = (): string => {
    return masterPasswordOverride ?? localStorage.getItem(MASTER_PASSWORD_STORAGE_KEY) ?? import.meta.env.VITE_MASTER_PASSWORD ?? DEFAULT_MASTER_PASSWORD;
  };

  const getMasterPassword = useCallback((): string => {
    return resolveMasterPassword();
  }, [masterPasswordOverride]);

  const login = useCallback((password: string): boolean => {
    const correctPassword = resolveMasterPassword();
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

  const enableSync = useCallback((): void => {
    localStorage.setItem(SYNC_ENABLED_KEY, 'true');
    setSyncEnabled(true);
  }, []);

  const disableSync = useCallback((): void => {
    localStorage.removeItem(SYNC_ENABLED_KEY);
    setSyncEnabled(false);
  }, []);

  const cloudLogin = useCallback(async (email: string, otp?: string): Promise<void> => {
    const cloud = (db as any).cloud;
    if (!cloud) throw new Error('Dexie Cloud not available');
    if (otp) {
      // Step 2: Verify the OTP code
      await cloud.login({ email, otp, intent: 'login' });
    } else {
      // Step 1: Send OTP to email
      await cloud.login({ email, intent: 'login' });
    }
  }, []);

  const cloudLogout = useCallback(async (): Promise<void> => {
    const cloud = (db as any).cloud;
    if (!cloud) return;
    await cloud.logout();
    setCloudUser(null);
  }, []);

  const setMasterPassword = useCallback((password: string): void => {
    localStorage.setItem(MASTER_PASSWORD_STORAGE_KEY, password);
    setMasterPasswordOverride(password);
  }, []);

  return (
    <AuthContext.Provider
      value={{ isAuthenticated, login, logout, getMasterPassword, setMasterPassword, syncEnabled, enableSync, disableSync, cloudUser, cloudSyncing, cloudLogin, cloudLogout }}
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
