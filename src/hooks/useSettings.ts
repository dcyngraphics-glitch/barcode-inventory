import type { Settings } from '@/types';
import { useSettingsContext } from '@/context/SettingsContext';

/**
 * Settings hook.
 *
 * Consumes shared context (single source of truth).
 * Must be used within <SettingsProvider>.
 */
export function useSettings(): { settings: Settings; updateSettings: (patch: Partial<Settings>) => void } {
  const ctx = useSettingsContext();
  return { settings: ctx.settings, updateSettings: ctx.updateSettings };
}
