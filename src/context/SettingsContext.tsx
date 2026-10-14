import { createContext, useContext, useCallback, useEffect, useRef, useState } from 'react';
import type { Settings } from '@/types';
import { DEFAULT_SETTINGS } from '@/types';
import { loadSettings, saveSettings } from '@/services/settingsService';

interface SettingsContextValue {
  settings: Settings;
  updateSettings: (patch: Partial<Settings>) => void;
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
  const saveTimeoutRef = useRef<number | null>(null);
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
        const patch = pendingPatchRef.current;
        pendingPatchRef.current = null;
        setSettings(patch ? applyPatch(s, patch) : s);
      })
      .catch((err) => {
        console.error('Failed to load settings:', err);
        // Keep defaults on error — settings remain usable offline.
        hasLoadedRef.current = true;
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

    // Debounce save to reduce write frequency
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = window.setTimeout(() => {
      saveSettings(settings).catch((err) => {
        console.error('Failed to save settings:', err);
      });
    }, 500);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
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
    <SettingsContext.Provider value={{ settings, updateSettings }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettingsContext(): SettingsContextValue {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettingsContext must be used within SettingsProvider');
  return ctx;
}
