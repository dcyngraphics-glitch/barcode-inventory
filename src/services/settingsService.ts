import type { Settings } from '@/types';
import { DEFAULT_SETTINGS, SETTINGS_ID } from '@/types';
import { getDB } from '@/db/database';

export async function loadSettings(): Promise<Settings> {
  const db = await getDB();
  const stored = await db.get('settings', SETTINGS_ID);
  if (!stored) {
    // DB is empty or settings not yet saved — initialize with defaults
    // and persist so future calls are fast
    const defaults: Settings = { ...DEFAULT_SETTINGS };
    await db.put('settings', defaults).catch(() => {});
    return defaults;
  }
  return { ...DEFAULT_SETTINGS, ...stored };
}

export async function saveSettings(settings: Settings): Promise<void> {
  const db = await getDB();
  await db.put('settings', settings);
}
