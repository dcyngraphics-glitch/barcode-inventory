import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type FC,
  type ReactNode,
} from 'react';
import { loadSettings } from '@/services/settingsService';

export type AppMode = 'shop' | 'sell';

/**
 * Device-local storage key.
 *
 * Mode describes THIS DEVICE'S ROLE, not the account's. It used to live in
 * `settings.cashierMode`, which Dexie Cloud syncs to every device on the account —
 * so switching the store tablet to Sell also switched the owner's phone. A till
 * stays a till; a phone stays a phone.
 */
const STORAGE_KEY = 'appMode';

/**
 * Upper bound on the one-time seed read.
 *
 * `loadSettings` either resolves or rejects on a healthy IndexedDB, but a wedged
 * database (another tab holding a version upgrade, for instance) can leave the
 * promise pending forever. Without this bound `hasLoaded` would never become true
 * and every consumer gated on it would render a permanent skeleton — an app that is
 * not merely slow but unusable. Same class of guard as the catalog-seed timeout in
 * App.tsx.
 */
export const SEED_TIMEOUT_MS = 3000;

interface ModeContextValue {
  mode: AppMode;
  isSell: boolean;
  setMode: (mode: AppMode) => void;
  /**
   * False until the stored or seeded mode is known. Consumers must not render a
   * mode-dependent route before this is true, or the root screen flashes the
   * wrong screen on cold start.
   */
  hasLoaded: boolean;
}

const ModeContext = createContext<ModeContextValue | undefined>(undefined);

function isAppMode(value: unknown): value is AppMode {
  return value === 'shop' || value === 'sell';
}

function readStored(): AppMode | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return isAppMode(raw) ? raw : null;
  } catch {
    // Storage can be unavailable (private mode, blocked cookies). Not fatal —
    // the in-memory mode still works for this session.
    return null;
  }
}

function writeStored(mode: AppMode): void {
  try {
    localStorage.setItem(STORAGE_KEY, mode);
  } catch {
    /* ignore */
  }
}

export const ModeProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const [mode, setModeState] = useState<AppMode>('shop');
  const [hasLoaded, setHasLoaded] = useState(false);

  /**
   * Set the instant the user picks a mode, so a slow seed cannot clobber their
   * choice when it finally settles. Without this, a tap landing inside the seeding
   * window is silently discarded.
   */
  const userChoseRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    /**
     * `persist` is false when the seed could not be read (timeout or failure).
     * Recording 'shop' in that case would lock the device to Shop permanently on
     * the strength of a transient error, so the seed is left to retry next launch.
     */
    const settle = (resolved: AppMode, persist: boolean): void => {
      if (cancelled) return;
      if (!userChoseRef.current) {
        if (persist) writeStored(resolved);
        setModeState(resolved);
      }
      // Always true, whatever happened: a stuck false would strand the app on a
      // permanent skeleton, which is worse than any wrong default.
      setHasLoaded(true);
    };

    (async () => {
      const stored = readStored();
      if (stored) {
        settle(stored, false);
        return;
      }

      // One-time seed from the synced setting, so an existing cashier-mode user
      // keeps their mode after this change ships.
      const timeout = new Promise<null>((resolve) => {
        timer = setTimeout(() => resolve(null), SEED_TIMEOUT_MS);
      });
      const settings = await Promise.race([
        loadSettings().catch(() => null),
        timeout,
      ]);

      if (settings) {
        settle(settings.cashierMode ? 'sell' : 'shop', true);
      } else {
        settle('shop', false);
      }
    })();

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, []);

  const setMode = useCallback((next: AppMode) => {
    userChoseRef.current = true;
    writeStored(next);
    setModeState(next);
  }, []);

  return (
    <ModeContext.Provider value={{ mode, isSell: mode === 'sell', setMode, hasLoaded }}>
      {children}
    </ModeContext.Provider>
  );
};

export function useMode(): ModeContextValue {
  const ctx = useContext(ModeContext);
  if (!ctx) throw new Error('useMode must be used within ModeProvider');
  return ctx;
}
