import type { Settings } from '@/types';
import { DEFAULT_SETTINGS } from '@/types';
import { getDB } from '@/db/database';

export async function loadSettings(): Promise<Settings> {
  const db = await getDB();
  const stored = await db.get('settings', 'settings');
  if (!stored) return { ...DEFAULT_SETTINGS };
  return { ...DEFAULT_SETTINGS, ...stored };
}

export async function saveSettings(settings: Settings): Promise<void> {
  const db = await getDB();
  await db.put('settings', settings);
}

export async function clearSettings(): Promise<void> {
  const db = await getDB();
  await db.delete('settings', 'settings');
}
