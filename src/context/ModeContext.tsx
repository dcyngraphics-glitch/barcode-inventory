import {
  createContext,
  useCallback,
  useContext,
  useEffect,
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

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const stored = readStored();
      if (stored) {
        if (!cancelled) {
          setModeState(stored);
          setHasLoaded(true);
        }
        return;
      }

      // One-time seed from the synced setting, so an existing cashier-mode user
      // keeps their mode after this change ships. Any failure falls through to
      // 'shop' rather than blocking the app on a database read.
      let seeded: AppMode = 'shop';
      try {
        const settings = await loadSettings();
        seeded = settings.cashierMode ? 'sell' : 'shop';
      } catch {
        seeded = 'shop';
      }

      if (cancelled) return;
      // Writing here is what makes the seed happen exactly once: every later
      // mount finds a stored value and skips the database read entirely.
      writeStored(seeded);
      setModeState(seeded);
      setHasLoaded(true);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const setMode = useCallback((next: AppMode) => {
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
