import { useCallback, useEffect, useRef, useState } from 'react';
import type { Settings } from '@/types';
import { DEFAULT_SETTINGS } from '@/types';
import { loadSettings, saveSettings } from '@/services/settingsService';
import { useSettingsContext } from '@/context/SettingsContext';

/**
 * Settings hook.
 *
 * When used inside `<SettingsProvider>`, consumes shared context (single source
 * of truth, survives across components). Falls back to legacy local state when
 * no provider is present (e.g. tests that don't wrap with the provider).
 */
export function useSettings() {
  try {
    const ctx = useSettingsContext();
    return { settings: ctx.settings, updateSettings: ctx.updateSettings };
  } catch {
    return useSettingsLocal();
  }
}

function useSettingsLocal(): { settings: Settings | null; updateSettings: (patch: Partial<Settings>) => void } {
  const [settings, setSettings] = useState<Settings | null>(null);
  const loadedRef = useRef(false);

  useEffect(() => {
    loadSettings()
      .then((s) => {
        setSettings(s);
        loadedRef.current = true;
      })
      .catch(() => {
        setSettings({ ...DEFAULT_SETTINGS });
        loadedRef.current = true;
      });
  }, []);

  useEffect(() => {
    if (loadedRef.current && settings) {
      saveSettings(settings);
    }
  }, [settings]);

  const updateSettings = useCallback((patch: Partial<Settings>) => {
    setSettings((prev) => (prev ? { ...prev, ...patch } : null));
  }, []);

  return { settings, updateSettings };
}

export { DEFAULT_SETTINGS };
