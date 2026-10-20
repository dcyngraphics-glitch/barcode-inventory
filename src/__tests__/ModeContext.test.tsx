import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { ModeProvider, useMode } from '@/context/ModeContext';
import { saveSettings } from '@/services/settingsService';
import { DEFAULT_SETTINGS } from '@/types';

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
});
