import { describe, it, expect, afterEach, vi } from 'vitest';
import { loadSettings, saveSettings } from '../services/settingsService';
import { DEFAULT_SETTINGS } from '../types';
import { db } from '../db/database';

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

describe('settingsService error handling', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  // settingsService talks to the Dexie tables directly (db.settings.get/put); it does
  // not go through getDB(). Spy on the real dependency so these actually exercise the
  // error paths instead of silently hitting the live database.
  it('should handle database errors on save', async () => {
    vi.spyOn(db.settings, 'put').mockRejectedValue(new Error('DB error'));

    const settings = { ...DEFAULT_SETTINGS, alertWindowDays: 5 };
    await expect(saveSettings(settings)).rejects.toThrow('DB error');
  });

  it('should handle database errors on load', async () => {
    vi.spyOn(db.settings, 'get').mockRejectedValue(new Error('DB read error'));

    await expect(loadSettings()).rejects.toThrow('DB read error');
  });

  it('should log and surface errors when persisting default settings fails', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(db.settings, 'get').mockResolvedValue(undefined);
    vi.spyOn(db.settings, 'put').mockRejectedValue(new Error('DB write error'));

    await expect(loadSettings()).rejects.toThrow('DB write error');
    expect(consoleError).toHaveBeenCalledWith(
      'Failed to persist default settings:',
      expect.any(Error),
    );
  });

  it('should return defaults merged with stored settings when no error occurs', async () => {
    vi.spyOn(db.settings, 'get').mockResolvedValue({ ...DEFAULT_SETTINGS, theme: 'dark' });
    const putSpy = vi.spyOn(db.settings, 'put').mockResolvedValue(undefined as never);

    const loaded = await loadSettings();
    expect(loaded.theme).toBe('dark');
    expect(putSpy).not.toHaveBeenCalled();
  });
});

describe('settingsService validation integration', () => {
  it('should reject invalid settings on save', async () => {
    const invalid = { ...DEFAULT_SETTINGS, theme: 'invalid' as never };
    await expect(saveSettings(invalid)).rejects.toThrow('Invalid theme');
  });

  it('should reject out-of-range alertWindowDays on save', async () => {
    const invalid = { ...DEFAULT_SETTINGS, alertWindowDays: 0 };
    await expect(saveSettings(invalid)).rejects.toThrow(
      'alertWindowDays must be between 1 and 30',
    );
  });

  it('should accept valid settings on save', async () => {
    const valid = { ...DEFAULT_SETTINGS, alertWindowDays: 7, theme: 'dark' as const };
    await expect(saveSettings(valid)).resolves.toBeUndefined();
  });

  it('should not persist invalid settings to the database', async () => {
    const invalid = { ...DEFAULT_SETTINGS, alertWindowDays: -5 };
    await expect(saveSettings(invalid)).rejects.toThrow();
    const loaded = await loadSettings();
    expect(loaded.alertWindowDays).not.toBe(-5);
  });
});
