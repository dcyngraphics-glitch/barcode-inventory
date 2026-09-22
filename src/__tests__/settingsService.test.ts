import { describe, it, expect } from 'vitest';
import { loadSettings, saveSettings } from '../services/settingsService';
import { DEFAULT_SETTINGS } from '../types';

describe('settingsService', () => {
  it('should return default settings when none saved', async () => {
    const settings = await loadSettings();
    expect(settings).toEqual(DEFAULT_SETTINGS);
  });

  it('should save and load custom settings', async () => {
    const custom = { ...DEFAULT_SETTINGS, alertWindowDays: 7, theme: 'dark' as const, notificationsEnabled: true };
    await saveSettings(custom);
    const loaded = await loadSettings();
    expect(loaded.alertWindowDays).toBe(7);
    expect(loaded.theme).toBe('dark');
    expect(loaded.notificationsEnabled).toBe(true);
  });

  it('should preserve settings id', async () => {
    const settings = await loadSettings();
    expect(settings.id).toBe('settings');
  });
});
