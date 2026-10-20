import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ModeProvider } from '@/context/ModeContext';
import { ScanCartProvider, useScanCart } from '@/context/ScanCartContext';
import { AppModeSwitcher } from '@/components/AppModeSwitcher';

const SeedCart = () => {
  const { addItem } = useScanCart();
  return (
    <button
      onClick={() =>
        addItem({
          barcode: '4800361394093',
          product: null,
          name: 'Bear Brand',
          brand: 'Bear Brand',
          price: 24,
          expiryDate: '2026-01-01',
          quantity: 1,
          needsInfo: false,
          source: 'manual',
        })
      }
    >
      seed-cart
    </button>
  );
};

/** Reads the live cart size, so the tests can prove what actually happened to it. */
const CartCount = () => {
  const { totalItems } = useScanCart();
  return <span data-testid="cart-count">{totalItems}</span>;
};

const setup = () =>
  render(
    <ModeProvider>
      <ScanCartProvider>
        <SeedCart />
        <CartCount />
        <AppModeSwitcher />
      </ScanCartProvider>
    </ModeProvider>
  );

const cartCount = () => screen.getByTestId('cart-count').textContent;
const dialogTitle = () => screen.queryByText(/items in the basket/i);

describe('switching away from Sell with a non-empty basket', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('appMode', 'sell');
  });

  it('warns before the basket would be discarded, and does not switch yet', async () => {
    setup();
    await screen.findByRole('radio', { name: 'Sell' });

    fireEvent.click(screen.getByText('seed-cart'));
    expect(cartCount()).toBe('1');

    fireEvent.click(screen.getByRole('radio', { name: 'Shop' }));

    expect(await dialogTitle()).toBeInTheDocument();
    // Neither the mode nor the basket may change while the question is open —
    // otherwise the basket is already gone and the dialog is theatre.
    expect(localStorage.getItem('appMode')).toBe('sell');
    expect(cartCount()).toBe('1');
  });

  it('keeps the basket and stays in Sell when cancelled', async () => {
    setup();
    await screen.findByRole('radio', { name: 'Sell' });

    fireEvent.click(screen.getByText('seed-cart'));
    fireEvent.click(screen.getByRole('radio', { name: 'Shop' }));
    fireEvent.click(await screen.findByRole('button', { name: /keep basket/i }));

    await waitFor(() => expect(dialogTitle()).not.toBeInTheDocument());
    expect(localStorage.getItem('appMode')).toBe('sell');
    // The point of "Keep basket": the items must still be there. Without this the
    // test would pass even if cancelling wiped the cart.
    expect(cartCount()).toBe('1');
  });

  it('clears the basket and switches when confirmed', async () => {
    setup();
    await screen.findByRole('radio', { name: 'Sell' });

    fireEvent.click(screen.getByText('seed-cart'));
    fireEvent.click(screen.getByRole('radio', { name: 'Shop' }));
    fireEvent.click(await screen.findByRole('button', { name: /clear and switch/i }));

    await waitFor(() => expect(localStorage.getItem('appMode')).toBe('shop'));
    // "Clear and switch" must actually clear — asserting only the mode would let a
    // switch that leaves the basket behind pass.
    expect(cartCount()).toBe('0');
  });

  it('switches immediately when the basket is empty', async () => {
    setup();
    await screen.findByRole('radio', { name: 'Sell' });

    fireEvent.click(screen.getByRole('radio', { name: 'Shop' }));

    await waitFor(() => expect(localStorage.getItem('appMode')).toBe('shop'));
    expect(dialogTitle()).not.toBeInTheDocument();
  });

  it('does not warn when switching into Sell, which cannot lose anything', async () => {
    localStorage.setItem('appMode', 'shop');
    setup();
    await screen.findByRole('radio', { name: 'Shop' });

    fireEvent.click(screen.getByText('seed-cart'));
    fireEvent.click(screen.getByRole('radio', { name: 'Sell' }));

    await waitFor(() => expect(localStorage.getItem('appMode')).toBe('sell'));
    expect(dialogTitle()).not.toBeInTheDocument();
  });
});
