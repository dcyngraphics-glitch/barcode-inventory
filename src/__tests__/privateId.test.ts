import { describe, it, expect } from 'vitest';
import { privateId, productIdFor } from '@/utils/privateId';

describe('privateId', () => {
  it('prefixes a bare value', () => {
    expect(privateId('settings')).toBe('#settings');
  });

  it('is idempotent', () => {
    expect(privateId('#settings')).toBe('#settings');
  });

  it('keeps the barcode intact behind the prefix', () => {
    expect(productIdFor('4801234567890')).toBe('#4801234567890');
  });

  it("is deterministic, so seeding converges across a user's devices", () => {
    expect(productIdFor('4801')).toBe(productIdFor('4801'));
  });
});
