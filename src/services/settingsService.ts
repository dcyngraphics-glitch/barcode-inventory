import type { Settings } from '@/types';
import { DEFAULT_SETTINGS, SETTINGS_ID } from '@/types';
import { getDB } from '@/db/database';
import { validateSettings } from './settingsValidation';

export async function loadSettings(): Promise<Settings> {
  const db = await getDB();
  const stored = await db.get('settings', SETTINGS_ID);
  if (!stored) {
    // DB is empty or settings not yet saved — initialize with defaults
    // and persist so future calls are fast
    const defaults: Settings = { ...DEFAULT_SETTINGS };
    try {
      await db.put('settings', defaults);
    } catch (err) {
      console.error('Failed to persist default settings:', err);
      throw err;
    }
    return defaults;
  }
  const clean = Object.fromEntries(Object.entries(stored).filter(([, v]) => v !== undefined));
  return { ...DEFAULT_SETTINGS, ...clean };
}

export async function saveSettings(settings: Settings): Promise<void> {
  validateSettings(settings);
  const db = await getDB();
  await db.put('settings', settings);
}
