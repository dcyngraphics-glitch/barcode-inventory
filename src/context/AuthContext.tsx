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
  /**
   * Starts the Dexie Cloud login for the given email. Deliberately returns void and is
   * not awaited: the addon keeps the underlying promise pending while it prompts for the
   * OTP (through db.cloud.userInteraction) and resolves it once the code is verified.
   * Progress is observed via `cloudUser`, failures via `cloudError`.
   */
  cloudLogin: (email: string) => void;
  cloudError: string;
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
  const [cloudError, setCloudError] = useState<string>('');

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

  const cloudLogin = useCallback((email: string): void => {
    const cloud = (db as any).cloud;
    if (!cloud) {
      setCloudError('Dexie Cloud not available');
      return;
    }
    // cloud.options is null until configure() has run. Without this check the addon
    // throws an opaque "Cannot read properties of null (reading 'databaseUrl')".
    if (!cloud.options) {
      setCloudError('Sync is not configured in this build.');
      return;
    }
    setCloudError('');
    // No `intent` on purpose. intent:'login' tells Dexie Cloud that only already
    // registered users are acceptable, so a first-time login on this database is
    // refused with USER_NOT_REGISTERED ("user is not registered") no matter what the
    // database's user policy says. Omitting it lets the server apply the database's own
    // policy, which registers a new user on their first login.
    //
    // This also has to be ONE call. Dexie Cloud verifies an OTP against an `otp_id` that
    // the server returns alongside the emailed code, and the addon never exposes it - so
    // a follow-up login({ email, otp }) cannot verify anything, it just requests a brand
    // new code. The addon drives the whole email -> code exchange itself and asks for the
    // code via db.cloud.userInteraction.
    cloud.login({ email }).catch((err: any) => {
      if (err?.name === 'OAuthRedirectError') return; // page is redirecting for OAuth
      setCloudError(err?.message || 'Login failed. Please try again.');
    });
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
      value={{ isAuthenticated, login, logout, getMasterPassword, setMasterPassword, syncEnabled, enableSync, disableSync, cloudUser, cloudSyncing, cloudLogin, cloudError, cloudLogout }}
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
