import { describe, it, expect, vi } from 'vitest';
import { toDayKey } from '@/utils/dayKey';

describe('toDayKey', () => {
  it('uses local date parts, not UTC', () => {
    // 23:30 local on 15 Oct — must be 2026-10-15 even where UTC has rolled over
    const d = new Date(2026, 9, 15, 23, 30, 0);
    expect(toDayKey(d)).toBe('2026-10-15');
  });

  it('stays on the local day when UTC is still on the previous day', () => {
    // 01:00 local in UTC+8 is 17:00 UTC on 14 Oct, so a toISOString()-based
    // implementation returns '2026-10-14' here and this assertion catches it.
    const d = new Date(2026, 9, 15, 1, 0, 0);
    expect(toDayKey(d)).toBe('2026-10-15');
  });

  it('does not read toISOString at all (timezone-independent guard)', () => {
    // The tests above only distinguish a UTC implementation in some timezones.
    // This one proves it on any machine: if toDayKey ever calls toISOString,
    // it gets a stubbed wrong day and fails.
    const spy = vi.spyOn(Date.prototype, 'toISOString')
      .mockReturnValue('1999-01-01T00:00:00.000Z');
    expect(toDayKey(new Date(2026, 9, 15, 12, 0, 0))).toBe('2026-10-15');
    spy.mockRestore();
  });

  it('zero-pads month and day', () => {
    expect(toDayKey(new Date(2026, 0, 5, 9, 0, 0))).toBe('2026-01-05');
  });
});
