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

  useEffect(() => {
    let cancelled = false;

    // Dexie Cloud publishes the persisted session on Dexie's 'ready' event, so the
    // database has to be OPENED before we can know who is signed in — and this hook is
    // what renders before the app does, so nothing else opens it this early. Without
    // this the gate waits on isLoading forever and the app sits on the splash screen.
    // (Found by loading the built app; the unit tests could not catch it because they
    // stub db.cloud and never exercise the addon's ready hook.)
    Promise.resolve((db as any).open?.()).catch((err: unknown) => {
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
    if (!cloud?.currentUser?.subscribe) {
      // No addon — tests, or a build where configure() never ran. Settle as signed out
      // rather than hanging on isLoading and pinning the app on the splash screen.
      setSession(SIGNED_OUT);
      return;
    }

    const subscription = cloud.currentUser.subscribe((user: any) => {
      setSession((previous) => ({
        isLoading: Boolean(user?.isLoading),
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
