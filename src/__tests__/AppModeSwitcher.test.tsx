import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ModeProvider } from '@/context/ModeContext';
import { ScanCartProvider } from '@/context/ScanCartContext';
import { AppModeSwitcher } from '@/components/AppModeSwitcher';

const setup = () =>
  render(
    <ModeProvider>
      <ScanCartProvider>
        <AppModeSwitcher />
      </ScanCartProvider>
    </ModeProvider>
  );

/** The switcher renders nothing until the mode is known, so every query is async. */
async function shopAndSell() {
  const shop = await screen.findByRole('radio', { name: 'Shop' });
  const sell = screen.getByRole('radio', { name: 'Sell' });
  return { shop, sell };
}

describe('AppModeSwitcher', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.resetModules();
  });

  it('renders both segments with Shop active by default', async () => {
    setup();

    const { shop, sell } = await shopAndSell();
    expect(shop).toHaveAttribute('aria-checked', 'true');
    expect(sell).toHaveAttribute('aria-checked', 'false');
  });

  it('reflects a stored Sell mode on first render', async () => {
    localStorage.setItem('appMode', 'sell');
    setup();

    const { shop, sell } = await shopAndSell();
    expect(sell).toHaveAttribute('aria-checked', 'true');
    expect(shop).toHaveAttribute('aria-checked', 'false');
  });

  it('switches mode on click and persists the choice', async () => {
    setup();

    const { shop, sell } = await shopAndSell();
    fireEvent.click(sell);

    expect(sell).toHaveAttribute('aria-checked', 'true');
    expect(shop).toHaveAttribute('aria-checked', 'false');
    // Persisted, not just local state — otherwise the choice is lost on reload.
    expect(localStorage.getItem('appMode')).toBe('sell');

    fireEvent.click(shop);
    expect(shop).toHaveAttribute('aria-checked', 'true');
    expect(localStorage.getItem('appMode')).toBe('shop');
  });

  it('uses a roving tabindex so the group is a single tab stop', async () => {
    setup();

    const { shop, sell } = await shopAndSell();
    expect(shop).toHaveAttribute('tabindex', '0');
    expect(sell).toHaveAttribute('tabindex', '-1');

    fireEvent.click(sell);
    expect(sell).toHaveAttribute('tabindex', '0');
    expect(shop).toHaveAttribute('tabindex', '-1');
  });

  it('moves the selection with the arrow keys', async () => {
    setup();

    const { shop, sell } = await shopAndSell();
    fireEvent.keyDown(shop, { key: 'ArrowRight' });

    await waitFor(() => expect(sell).toHaveAttribute('aria-checked', 'true'));
    expect(localStorage.getItem('appMode')).toBe('sell');

    fireEvent.keyDown(sell, { key: 'ArrowLeft' });
    await waitFor(() => expect(shop).toHaveAttribute('aria-checked', 'true'));
    expect(localStorage.getItem('appMode')).toBe('shop');
  });

  it('wraps around at both ends', async () => {
    setup();

    const { shop, sell } = await shopAndSell();
    // Left from the first segment wraps to the last.
    fireEvent.keyDown(shop, { key: 'ArrowLeft' });
    await waitFor(() => expect(sell).toHaveAttribute('aria-checked', 'true'));
  });

  it('ignores unrelated keys', async () => {
    setup();

    const { shop, sell } = await shopAndSell();
    fireEvent.keyDown(shop, { key: 'a' });
    fireEvent.keyDown(shop, { key: 'Enter' });

    expect(shop).toHaveAttribute('aria-checked', 'true');
    expect(sell).toHaveAttribute('aria-checked', 'false');
  });

  it('is labelled without the word "mode", which already means Auto/Manual scan', async () => {
    setup();

    const group = await screen.findByRole('radiogroup');
    const label = group.getAttribute('aria-label') ?? '';
    expect(label.length).toBeGreaterThan(0);
    // ModeSegmentedControl owns "Scan mode: Auto/Manual" on the scanner screen.
    expect(label.toLowerCase()).not.toContain('mode');
  });

  it('renders nothing until the mode is known, so the header cannot flash', () => {
    const { container } = render(
      <ModeProvider>
        <ScanCartProvider>
          <AppModeSwitcher />
        </ScanCartProvider>
      </ModeProvider>
    );
    // Synchronous first paint — before the effect settles there is no switcher.
    expect(container.querySelector('[role="radiogroup"]')).toBeNull();
  });
});
