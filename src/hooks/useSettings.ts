import { useCallback, useEffect, useState } from 'react';
import type { Settings } from '@/types';
import { loadSettings, saveSettings } from '@/services/settingsService';

export function useSettings() {
  const [settings, setSettings] = useState<Settings>(loadSettings);

  useEffect(() => {
    saveSettings(settings);
  }, [settings]);

  const updateSettings = useCallback((patch: Partial<Settings>) => {
    setSettings((prev) => ({ ...prev, ...patch }));
  }, []);

  return { settings, updateSettings };
}
