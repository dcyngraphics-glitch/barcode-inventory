import { useCallback, useEffect, useState } from 'react';
import type { Settings } from '@/types';
import { loadSettings, saveSettings } from '@/services/settingsService';

export function useSettings() {
  const [settings, setSettings] = useState<Settings | null>(null);

  useEffect(() => {
    loadSettings().then(setSettings);
  }, []);

  useEffect(() => {
    if (settings) {
      saveSettings(settings);
    }
  }, [settings]);

  const updateSettings = useCallback((patch: Partial<Settings>) => {
    setSettings((prev) => (prev ? { ...prev, ...patch } : null));
  }, []);

  return { settings, updateSettings };
}
