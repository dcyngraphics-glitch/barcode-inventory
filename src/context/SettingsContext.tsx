import { createContext, useContext, useCallback, useEffect, useRef, useState } from 'react';
import type { Settings } from '@/types';
import { DEFAULT_SETTINGS } from '@/types';
import { loadSettings, saveSettings } from '@/services/settingsService';

interface SettingsContextValue {
  settings: Settings;
  updateSettings: (patch: Partial<Settings>) => void;
  /**
   * False until the stored settings have been read. Consumers that branch on a
   * setting must wait for this, or they act on the defaults — which is how a
   * cashier-mode user reloading on /sales got bounced to the scanner.
   */
  hasLoaded: boolean;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

/** Merge defined keys of patch onto base (undefined values are skipped). */
function applyPatch(base: Settings, patch: Partial<Settings>): Settings {
  const next: Settings = { ...base };
  (Object.keys(patch) as Array<keyof Settings>).forEach((key) => {
    const value = patch[key];
    if (value !== undefined) {
      (next[key] as Settings[keyof Settings]) = value;
    }
  });
  return next;
}

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<Settings>({ ...DEFAULT_SETTINGS });
  const [hasLoaded, setHasLoaded] = useState(false);
  // Patches applied by updateSettings before the async load settled, so the
  // loaded settings don't clobber them.
  const pendingPatchRef = useRef<Partial<Settings> | null>(null);
  // True once the load attempt has settled (resolved or failed) — saves are
  // skipped until then so defaults in state can't overwrite stored settings.
  const hasLoadedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    loadSettings()
      .then((s) => {
        if (cancelled) return;
        hasLoadedRef.current = true;
        setHasLoaded(true);
        const patch = pendingPatchRef.current;
        pendingPatchRef.current = null;
        setSettings(patch ? applyPatch(s, patch) : s);
      })
      .catch((err) => {
        console.error('Failed to load settings:', err);
        // Apply any buffered patches so they aren't lost on load failure
        const pending = pendingPatchRef.current;
        if (pending) {
          setSettings((prev) => applyPatch(prev, pending));
          pendingPatchRef.current = null;
        }
        // Keep defaults on error — settings remain usable offline.
        hasLoadedRef.current = true;
        setHasLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    // Never write before the load attempt settles: defaults (or defaults
    // plus buffered pre-load edits) are in state until then, and saving
    // them could overwrite stored settings. Pre-load edits are buffered in
    // pendingPatchRef and applied on top of the loaded settings.
    if (!hasLoadedRef.current) return;

    // Save immediately to ensure settings persist even if user navigates away
    saveSettings(settings).catch((err) => {
      console.error('Failed to save settings:', err);
    });
  }, [settings]);

  const updateSettings = useCallback((patch: Partial<Settings>) => {
    // Buffer pre-load edits so the loaded settings don't clobber them and
    // so no save fires before the load attempt settles.
    if (!hasLoadedRef.current) {
      pendingPatchRef.current = { ...pendingPatchRef.current, ...patch };
    }
    setSettings((prev) => applyPatch(prev, patch));
  }, []);

  return (
    <SettingsContext.Provider value={{ settings, updateSettings, hasLoaded }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettingsContext(): SettingsContextValue {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettingsContext must be used within SettingsProvider');
  return ctx;
}
