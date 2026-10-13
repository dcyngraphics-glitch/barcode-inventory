import { describe, it, expect } from 'vitest';
import { validateSettings } from '../services/settingsValidation';
import { DEFAULT_SETTINGS } from '../types';

describe('settingsValidation', () => {
  it('should accept valid settings', () => {
    expect(() => validateSettings(DEFAULT_SETTINGS)).not.toThrow();
  });

  it('should reject invalid theme', () => {
    const invalid = { ...DEFAULT_SETTINGS, theme: 'invalid' as never };
    expect(() => validateSettings(invalid)).toThrow('Invalid theme');
  });

  it('should reject alertWindowDays out of range', () => {
    const invalid = { ...DEFAULT_SETTINGS, alertWindowDays: 0 };
    expect(() => validateSettings(invalid)).toThrow('alertWindowDays must be between 1 and 30');
  });

  it('should reject negative alertWindowDays', () => {
    const invalid = { ...DEFAULT_SETTINGS, alertWindowDays: -1 };
    expect(() => validateSettings(invalid)).toThrow('alertWindowDays must be between 1 and 30');
  });

  it('should reject alertWindowDays above range', () => {
    const invalid = { ...DEFAULT_SETTINGS, alertWindowDays: 31 };
    expect(() => validateSettings(invalid)).toThrow('alertWindowDays must be between 1 and 30');
  });

  it('should reject non-number alertWindowDays', () => {
    const invalid = { ...DEFAULT_SETTINGS, alertWindowDays: 'seven' as never };
    expect(() => validateSettings(invalid)).toThrow('alertWindowDays must be between 1 and 30');
  });
});
