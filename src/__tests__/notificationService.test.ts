import { describe, it, expect } from 'vitest';
import {
  calculateExpiryStatus,
  getDaysUntilExpiry,
  notifyExpiringItems,
} from '../services/notificationService';
import type { Batch } from '../types';

describe('notificationService', () => {
  it('should return good for dates beyond alert window', () => {
    const future = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    expect(calculateExpiryStatus(future, 3)).toBe('good');
  });

  it('should return expiring for dates within alert window', () => {
    const soon = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    expect(calculateExpiryStatus(soon, 3)).toBe('expiring');
  });

  it('should return expired for past dates', () => {
    const past = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    expect(calculateExpiryStatus(past, 3)).toBe('expired');
  });

  it('should return expiring for today', () => {
    const today = new Date().toISOString().split('T')[0];
    expect(calculateExpiryStatus(today, 3)).toBe('expiring');
  });

  it('should calculate days until expiry correctly', () => {
    const future = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    expect(getDaysUntilExpiry(future)).toBe(5);
  });

  it('should return negative days for expired items', () => {
    const past = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    expect(getDaysUntilExpiry(past)).toBe(-3);
  });

  it('should not throw when notifying without permission', async () => {
    const batches: Batch[] = [];
    await expect(notifyExpiringItems(batches, 3)).resolves.not.toThrow();
  });
});
