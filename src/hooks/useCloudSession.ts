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
}

const SIGNED_OUT: CloudSession = { isLoading: false, isLoggedIn: false, email: null };

/**
 * The app's single source of truth for "is someone signed in?".
 *
 * Deliberately not gated on navigator.onLine: Dexie Cloud keeps a long-lived session
 * (refresh token + a non-exportable CryptoKey in IndexedDB), so a signed-in user stays
 * signed in offline. Only the very first login on a device needs the network.
 */
export function useCloudSession(): CloudSession {
  const cloud = (db as any).cloud;
  const [session, setSession] = useState<CloudSession>({ isLoading: true, isLoggedIn: false, email: null });

  useEffect(() => {
    // Dexie Cloud publishes the persisted session on Dexie's 'ready' event, so the
    // database has to be OPENED before we can know who is signed in — and this hook is
    // what renders before the app does, so nothing else opens it this early. Without
    // this the gate waits on isLoading forever and the app sits on the splash screen.
    // (Found by loading the built app: the unit tests could not catch it, because they
    // stub db.cloud and never exercise the addon's ready hook.)
    Promise.resolve((db as any).open?.()).catch((err: unknown) => {
      console.error('[auth] Failed to open the local database:', err);
    });
  }, []);

  useEffect(() => {
    if (!cloud?.currentUser?.subscribe) {
      // No addon — tests, or a build where configure() never ran. Settle as signed out
      // rather than hanging on isLoading and pinning the app on the splash screen.
      setSession(SIGNED_OUT);
      return;
    }

    const subscription = cloud.currentUser.subscribe((user: any) => {
      setSession({
        isLoading: Boolean(user?.isLoading),
        isLoggedIn: Boolean(user?.isLoggedIn),
        email: user?.email ?? null,
      });
    });

    return () => subscription?.unsubscribe?.();
  }, [cloud]);

  return session;
}
