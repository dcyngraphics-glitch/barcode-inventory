import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import { ModeProvider, useMode, SEED_TIMEOUT_MS } from '@/context/ModeContext';
import { saveSettings } from '@/services/settingsService';
import { DEFAULT_SETTINGS } from '@/types';

/** Controllable behaviour for the one-time seed read. */
const h = vi.hoisted(() => ({ hang: false, delayMs: 0 }));

vi.mock('@/services/settingsService', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/services/settingsService')>();
  return {
    ...actual,
    loadSettings: vi.fn(async () => {
      if (h.hang) return new Promise<never>(() => {}); // never settles
      if (h.delayMs) await new Promise((r) => setTimeout(r, h.delayMs));
      return actual.loadSettings();
    }),
  };
});

const Probe = () => {
  const { mode, isSell, setMode, hasLoaded } = useMode();
  return (
    <div>
      <span data-testid="mode">{mode}</span>
      <span data-testid="isSell">{String(isSell)}</span>
      <span data-testid="hasLoaded">{String(hasLoaded)}</span>
      <button onClick={() => setMode('sell')}>to-sell</button>
      <button onClick={() => setMode('shop')}>to-shop</button>
    </div>
  );
};

/** Wait for the provider to settle, then read the resolved mode. */
async function settledMode(): Promise<string> {
  await waitFor(() => expect(screen.getByTestId('hasLoaded').textContent).toBe('true'));
  return screen.getByTestId('mode').textContent ?? '';
}

describe('ModeContext', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('defaults to shop when nothing is stored and the synced setting is false', async () => {
    await saveSettings({ ...DEFAULT_SETTINGS, cashierMode: false });

    render(<ModeProvider><Probe /></ModeProvider>);

    expect(await settledMode()).toBe('shop');
    expect(screen.getByTestId('isSell').textContent).toBe('false');
  });

  it('seeds sell from a synced cashierMode=true setting, and writes it to localStorage once', async () => {
    await saveSettings({ ...DEFAULT_SETTINGS, cashierMode: true });

    render(<ModeProvider><Probe /></ModeProvider>);

    expect(await settledMode()).toBe('sell');
    expect(localStorage.getItem('appMode')).toBe('sell');
  });

  it('prefers localStorage over the synced setting', async () => {
    await saveSettings({ ...DEFAULT_SETTINGS, cashierMode: true });
    localStorage.setItem('appMode', 'shop');

    render(<ModeProvider><Probe /></ModeProvider>);

    expect(await settledMode()).toBe('shop');
  });

  it('setMode persists to localStorage and flips isSell', async () => {
    await saveSettings({ ...DEFAULT_SETTINGS, cashierMode: false });

    render(<ModeProvider><Probe /></ModeProvider>);
    await settledMode();

    fireEvent.click(screen.getByText('to-sell'));

    expect(screen.getByTestId('mode').textContent).toBe('sell');
    expect(screen.getByTestId('isSell').textContent).toBe('true');
    expect(localStorage.getItem('appMode')).toBe('sell');

    fireEvent.click(screen.getByText('to-shop'));

    expect(screen.getByTestId('mode').textContent).toBe('shop');
    expect(localStorage.getItem('appMode')).toBe('shop');
  });

  it('ignores a corrupt stored value and falls back to the synced setting', async () => {
    await saveSettings({ ...DEFAULT_SETTINGS, cashierMode: true });
    localStorage.setItem('appMode', 'nonsense');

    render(<ModeProvider><Probe /></ModeProvider>);

    expect(await settledMode()).toBe('sell');
  });

  it('throws when useMode is used outside the provider', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<Probe />)).toThrow('useMode must be used within ModeProvider');
    spy.mockRestore();
  });

  it('does not let a slow seed overwrite a mode the user already chose', async () => {
    // The seed would resolve to 'shop' — so if the guard is missing, the user's
    // 'sell' is silently reverted when the read lands.
    await saveSettings({ ...DEFAULT_SETTINGS, cashierMode: false });
    h.delayMs = 60;

    try {
      render(<ModeProvider><Probe /></ModeProvider>);

      // The user picks inside the seeding window.
      fireEvent.click(screen.getByText('to-sell'));
      expect(screen.getByTestId('mode').textContent).toBe('sell');

      await waitFor(() => expect(screen.getByTestId('hasLoaded').textContent).toBe('true'));

      expect(screen.getByTestId('mode').textContent).toBe('sell');
      expect(localStorage.getItem('appMode')).toBe('sell');
    } finally {
      h.delayMs = 0;
    }
  });

  it('still settles when the seed read hangs, so the app is never stranded', async () => {
    h.hang = true;
    vi.useFakeTimers();
    try {
      render(<ModeProvider><Probe /></ModeProvider>);

      await act(async () => {
        await vi.advanceTimersByTimeAsync(SEED_TIMEOUT_MS + 50);
      });

      // hasLoaded must become true regardless — a permanent skeleton is worse
      // than any wrong default.
      expect(screen.getByTestId('hasLoaded').textContent).toBe('true');
      expect(screen.getByTestId('mode').textContent).toBe('shop');
      // But it must NOT persist: a transient failure should not lock the device
      // to Shop for good, so the seed can retry on the next launch.
      expect(localStorage.getItem('appMode')).toBeNull();
    } finally {
      vi.useRealTimers();
      h.hang = false;
    }
  });
});
