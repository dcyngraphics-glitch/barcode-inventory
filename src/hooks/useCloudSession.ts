import { useEffect, useState } from 'react';
import db from '@/db/dexie';

export interface CloudSession {
  /**
   * True while Dexie Cloud is still restoring a persisted session from IndexedDB.
   * `db.cloud.currentUser` is initialised as UNAUTHORIZED_USER with isLoading:true, so
   * gating on this is what stops the login screen flashing on every cold start — the
   * session is read from storage, not from the network, so it usually resolves fast.
   */
  isLoading: boolean;
  isLoggedIn: boolean;
  email: string | null;
  /**
   * Set when the local database could not be opened. The app cannot function without
   * it, so this is a terminal state with something for the user to act on — not a
   * spinner that never ends.
   */
  error: string | null;
}

const SIGNED_OUT: CloudSession = { isLoading: false, isLoggedIn: false, email: null, error: null };

/**
 * The app's single source of truth for "is someone signed in?".
 *
 * Deliberately not gated on navigator.onLine: Dexie Cloud keeps a long-lived session
 * (refresh token + a non-exportable CryptoKey in IndexedDB), so a signed-in user stays
 * signed in offline. Only the very first login on a device needs the network.
 */
export function useCloudSession(): CloudSession {
  const cloud = (db as any).cloud;
  const [session, setSession] = useState<CloudSession>({
    isLoading: true,
    isLoggedIn: false,
    email: null,
    error: null,
  });

  // Bypass mode: the gate short-circuits for testing without an account. We
  // cannot return early here — React Hooks must be called in the exact same
  // order on every render — so the decision is deferred into the effects
  // below, which become no-ops for a bypassed session.
  const isBypassed = import.meta.env.VITE_BYPASS_LOGIN === 'true';

  useEffect(() => {
    if (isBypassed) {
      setSession({ isLoading: false, isLoggedIn: true, email: null, error: null });
      return;
    }

    let cancelled = false;

    // Open the database so the persisted session is available. Without this the
    // gate waits on isLoading forever and the app sits on the splash screen.
    Promise.resolve((db as any).open?.()).then(() => {
      if (cancelled) return;
      // DB opened successfully: settle isLoading so the app can leave the splash
      // screen. The session subscription below will drive isLoggedIn from here.
      setSession((prev) => ({ ...prev, isLoading: false, error: null }));
    }).catch((err: unknown) => {
      if (cancelled) return;
      console.error('[auth] Failed to open the local database:', err);
      // Settle instead of leaving isLoading true: an open failure used to pin the app
      // on the splash screen forever, with nothing for the user to act on.
      setSession({
        isLoading: false,
        isLoggedIn: false,
        email: null,
        error: 'Could not open local storage. Check that this browser allows site data, then reload.',
      });
    });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (isBypassed) return;

    if (!cloud?.currentUser?.subscribe) {
      // No addon — tests, or a build where configure() never ran. Settle as signed out
      // rather than hanging on isLoading and pinning the app on the splash screen.
      setSession(SIGNED_OUT);
      return;
    }

    const subscription = cloud.currentUser.subscribe((user: any) => {
      setSession((previous) => ({
        // The addon's UNAUTHORIZED_USER emission fires on mount (and again on logout
        // and login-start) with isLoading:true. Only a real logged-in session may
        // re-drive isLoading, or a cold start would get pinned on the splash. A real
        // restored session always carries isLoading:false, so we only read it then.
        isLoading: user?.isLoggedIn ? Boolean(user?.isLoading) : previous.isLoading,
        isLoggedIn: Boolean(user?.isLoggedIn),
        email: user?.email ?? null,
        // A storage failure is terminal; a later session emission must not mask it.
        error: previous.error,
      }));
    });

    return () => subscription?.unsubscribe?.();
  }, [cloud]);

  return session;
}
