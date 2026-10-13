import { describe, it, expect, afterEach, vi } from 'vitest';
import { loadSettings, saveSettings } from '../services/settingsService';
import { DEFAULT_SETTINGS } from '../types';
import * as dbModule from '../db/database';

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

  it('should handle database errors on save', async () => {
    const mockDB = {
      put: vi.fn().mockRejectedValue(new Error('DB error')),
    };
    vi.spyOn(dbModule, 'getDB').mockResolvedValue(mockDB as never);

    const settings = { ...DEFAULT_SETTINGS, alertWindowDays: 5 };
    await expect(saveSettings(settings)).rejects.toThrow('DB error');
  });

  it('should handle database errors on load', async () => {
    const mockDB = {
      get: vi.fn().mockRejectedValue(new Error('DB read error')),
    };
    vi.spyOn(dbModule, 'getDB').mockResolvedValue(mockDB as never);

    await expect(loadSettings()).rejects.toThrow('DB read error');
  });

  it('should log and surface errors when persisting default settings fails', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    const mockDB = {
      get: vi.fn().mockResolvedValue(undefined),
      put: vi.fn().mockRejectedValue(new Error('DB write error')),
    };
    vi.spyOn(dbModule, 'getDB').mockResolvedValue(mockDB as never);

    await expect(loadSettings()).rejects.toThrow('DB write error');
    expect(consoleError).toHaveBeenCalledWith(
      'Failed to persist default settings:',
      expect.any(Error),
    );
  });

  it('should return defaults merged with stored settings when no error occurs', async () => {
    const mockDB = {
      get: vi.fn().mockResolvedValue({ ...DEFAULT_SETTINGS, theme: 'dark' }),
      put: vi.fn().mockResolvedValue(undefined),
    };
    vi.spyOn(dbModule, 'getDB').mockResolvedValue(mockDB as never);

    const loaded = await loadSettings();
    expect(loaded.theme).toBe('dark');
    expect(mockDB.put).not.toHaveBeenCalled();
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
