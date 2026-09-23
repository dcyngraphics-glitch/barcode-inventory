import { useCallback } from 'react';
import type { Settings } from '@/types';
import { useSettingsContext } from '@/context/SettingsContext';

/**
 * Settings hook.
 *
 * Consumes shared context (single source of truth).
 * Must be used within <SettingsProvider>.
 */
export function useSettings(): { settings: Settings | null; updateSettings: (patch: Partial<Settings>) => void } {
  const ctx = useSettingsContext();
  return { settings: ctx.settings, updateSettings: ctx.updateSettings };
}
