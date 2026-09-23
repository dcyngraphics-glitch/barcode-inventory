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
        // Create a copy of previous settings
        const newSettings = { ...prev };
        // Only apply non-undefined values from the patch
        Object.keys(patch).forEach((key) => {
          const typedKey = key as keyof Settings;
          if (patch[typedKey] !== undefined) {
            // @ts-ignore - we know typedKey is a keyof Settings
            newSettings[typedKey] = patch[typedKey];
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
