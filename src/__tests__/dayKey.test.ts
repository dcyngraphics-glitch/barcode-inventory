import { describe, it, expect } from 'vitest';
import { toDayKey } from '@/utils/dayKey';

describe('toDayKey', () => {
  it('uses local date parts, not UTC', () => {
    // 23:30 local on 15 Oct — must be 2026-10-15 even where UTC has rolled over
    const d = new Date(2026, 9, 15, 23, 30, 0);
    expect(toDayKey(d)).toBe('2026-10-15');
  });

  it('zero-pads month and day', () => {
    expect(toDayKey(new Date(2026, 0, 5, 9, 0, 0))).toBe('2026-01-05');
  });
});
