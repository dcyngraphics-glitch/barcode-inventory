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
        saveSettings(settings).catch(err => {
          console.error('Failed to save settings:', err);
        });
      }
    }, [settings]);

  const updateSettings = useCallback((patch: Partial<Settings>) => {
    setSettings((prev) => {
      if (!prev) return null;
      const newSettings: Settings = { ...prev };
      (Object.keys(patch) as Array<keyof Settings>).forEach((key) => {
        const value = patch[key];
        if (value !== undefined) {
          (newSettings[key] as Settings[keyof Settings]) = value;
        }
      });
      return newSettings;
    });
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
