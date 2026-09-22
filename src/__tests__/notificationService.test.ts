import { describe, it, expect } from 'vitest';
import {
  calculateExpiryStatus,
  getDaysUntilExpiry,
  notifyExpiringItems,
  requestPermission,
  getPermissionStatus,
} from '../services/notificationService';
import type { Batch } from '../types';

describe('notificationService', () => {
  it('should return good for dates beyond alert window', () => {
    const future = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]!;
    expect(calculateExpiryStatus(future, 3)).toBe('good');
  });

  it('should return expiring for dates within alert window', () => {
    const soon = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]!;
    expect(calculateExpiryStatus(soon, 3)).toBe('expiring');
  });

  it('should return expired for past dates', () => {
    const past = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]!;
    expect(calculateExpiryStatus(past, 3)).toBe('expired');
  });

  it('should return expiring for today', () => {
    const today = new Date().toISOString().split('T')[0]!;
    expect(calculateExpiryStatus(today, 3)).toBe('expiring');
  });

  it('should calculate days until expiry correctly', () => {
    const future = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]!;
    expect(getDaysUntilExpiry(future)).toBe(5);
  });

  it('should return negative days for expired items', () => {
    const past = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]!;
    expect(getDaysUntilExpiry(past)).toBe(-3);
  });

  it('should not throw when notifying without permission', async () => {
    const batches: Batch[] = [];
    await expect(notifyExpiringItems(batches, 3)).resolves.not.toThrow();
  });

  it('should return denied when Notification API is unavailable', () => {
    // jsdom does not implement Notification
    expect(getPermissionStatus()).toBe('denied');
  });

  it('should request permission and return the result', async () => {
    // jsdom lacks Notification; requestPermission should resolve to 'denied'
    const result = await requestPermission();
    expect(result).toBe('denied');
  });

  it('should return current permission status', () => {
    const status = getPermissionStatus();
    expect(['granted', 'denied', 'default']).toContain(status);
  });
});
