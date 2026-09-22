import { createContext, useContext, useCallback, useEffect, useState } from 'react';
import type { Settings } from '@/types';
import { DEFAULT_SETTINGS } from '@/types';
import { loadSettings, saveSettings } from '@/services/settingsService';

interface SettingsContextValue {
  settings: Settings | null;
  updateSettings: (patch: Partial<Settings>) => void;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<Settings | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadSettings()
      .then((s) => {
        if (!cancelled) setSettings(s);
      })
      .catch(() => {
        if (!cancelled) setSettings({ ...DEFAULT_SETTINGS });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (settings) {
      saveSettings(settings);
    }
  }, [settings]);

  const updateSettings = useCallback((patch: Partial<Settings>) => {
    setSettings((prev) => (prev ? { ...prev, ...patch } : null));
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
