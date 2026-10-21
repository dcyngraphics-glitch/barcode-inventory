import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { TillScreen, ABSENCE_MS } from '@/screens/TillScreen';

// vi.hoisted keeps these available inside the hoisted vi.mock factories.
const h = vi.hoisted(() => ({
  cartItems: [] as Array<Record<string, unknown>>,
  addItem: vi.fn(),
  removeItem: vi.fn(),
  updateItem: vi.fn(),
  clearCart: vi.fn(),
  recordSale: vi.fn(),
  undoLastSale: vi.fn(),
  lookupProduct: vi.fn(),
  onScan: null as null | ((barcode: string) => void | Promise<void>),
  onNoDetection: null as null | (() => void),
}));

vi.mock('@/components/CameraViewfinder', () => ({
  CameraViewfinder: ({
    onScan,
    onNoDetection,
  }: {
    onScan: (barcode: string) => void;
    onNoDetection?: () => void;
  }) => {
    h.onScan = onScan;
    h.onNoDetection = onNoDetection ?? null;
    return <div data-testid="mock-viewfinder" />;
  },
}));

vi.mock('@/context/ScanCartContext', () => ({
  useScanCart: () => ({
    items: h.cartItems,
    addItem: h.addItem,
    removeItem: h.removeItem,
    updateItem: h.updateItem,
    clearCart: h.clearCart,
    totalPrice: h.cartItems.reduce(
      (sum, i) => sum + (i.price as number) * (i.quantity as number),
      0,
    ),
    totalItems: h.cartItems.reduce((sum, i) => sum + (i.quantity as number), 0),
  }),
}));

vi.mock('@/services/saleService', () => ({
  recordSale: h.recordSale,
  undoLastSale: h.undoLastSale,
}));

vi.mock('@/services/productLookupService', () => ({
  lookupProduct: h.lookupProduct,
}));

const cartItem = (over: Record<string, unknown> = {}) => ({
  id: 'c1',
  barcode: 'B1',
  product: null,
  name: 'Bear Brand',
  brand: 'Bear Brand',
  price: 12.5,
  expiryDate: '2026-06-01',
  quantity: 2,
  needsInfo: false,
  source: 'local',
  ...over,
});

const paidButton = () => screen.getByRole('button', { name: /^paid$/i });

describe('TillScreen', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    h.cartItems = [];
  });

  it('shows the basket with a running total', () => {
    h.cartItems = [cartItem()];
    render(<TillScreen />);

    expect(screen.getByText('Bear Brand')).toBeInTheDocument();
    expect(screen.getByText('2 × ₱12.50')).toBeInTheDocument();

    const footer = document.querySelector('.till-footer');
    expect(footer?.textContent).toContain('₱25.00');
  });

  it('disables Paid when the basket is empty', () => {
    render(<TillScreen />);
    expect(paidButton()).toBeDisabled();
    expect(screen.getByText('No items yet')).toBeInTheDocument();
  });

  it('records a sale, clears the basket, and snapshots the line price', async () => {
    h.cartItems = [cartItem()];
    h.recordSale.mockResolvedValue({ saleId: 's1', total: 25 });

    render(<TillScreen />);
    act(() => {
      fireEvent.click(paidButton());
    });

    await waitFor(() => expect(h.recordSale).toHaveBeenCalledTimes(1));
    expect(h.recordSale).toHaveBeenCalledWith([
      { barcode: 'B1', name: 'Bear Brand', brand: 'Bear Brand', price: 12.5, quantity: 2 },
    ]);
    expect(h.clearCart).toHaveBeenCalledTimes(1);
  });

  it('keeps the basket when recording fails, so the cashier can retry', async () => {
    h.cartItems = [cartItem()];
    h.recordSale.mockRejectedValue(new Error('disk full'));

    render(<TillScreen />);
    act(() => {
      fireEvent.click(paidButton());
    });

    await waitFor(() => expect(screen.getByText(/disk full/i)).toBeInTheDocument());
    expect(h.clearCart).not.toHaveBeenCalled();
  });

  it('restores the basket when Undo is tapped', async () => {
    h.cartItems = [cartItem()];
    h.recordSale.mockResolvedValue({ saleId: 's1', total: 25 });
    h.undoLastSale.mockResolvedValue(undefined);

    render(<TillScreen />);
    act(() => {
      fireEvent.click(paidButton());
    });

    const undo = await screen.findByRole('button', { name: /undo/i });
    act(() => {
      fireEvent.click(undo);
    });

    await waitFor(() => expect(h.undoLastSale).toHaveBeenCalledWith('s1'));
    expect(h.addItem).toHaveBeenCalledWith(
      expect.objectContaining({ barcode: 'B1', quantity: 2, price: 12.5 }),
    );
  });

  it('increases a line quantity from the basket', () => {
    h.cartItems = [cartItem({ quantity: 1 })];
    render(<TillScreen />);

    fireEvent.click(screen.getByRole('button', { name: /increase quantity of Bear Brand/i }));

    expect(h.updateItem).toHaveBeenCalledWith('c1', { quantity: 2 });
  });

  it('removes a line when its quantity drops below one', () => {
    h.cartItems = [cartItem({ quantity: 1 })];
    render(<TillScreen />);

    fireEvent.click(screen.getByRole('button', { name: /decrease quantity of Bear Brand/i }));

    expect(h.removeItem).toHaveBeenCalledWith('c1');
  });

  // The viewfinder re-reads a code that is still in frame every ~2s, and that gap
  // varies with how long detection takes — so no fixed "ignore repeats for N ms"
  // window is safe. A countdown that is too short adds the item twice (overcharging
  // the customer); presence is the signal that actually distinguishes the cases.
  describe('repeat reads of a barcode that is still in frame', () => {
    const found = {
      product: {
        barcode: 'B1',
        name: 'Bear Brand',
        brand: 'Bear Brand',
        category: '',
        storePrice: 12.5,
        defaultExpiry: '2026-06-01',
        source: 'local',
        createdAt: '',
        updatedAt: '',
      },
      source: 'local',
    };

    beforeEach(() => {
      h.lookupProduct.mockResolvedValue(found);
    });

    it('adds an item only once while the same code keeps being read', async () => {
      render(<TillScreen />);
      expect(h.onScan).toBeTypeOf('function');

      await act(async () => { await h.onScan!('B1'); });
      await act(async () => { await h.onScan!('B1'); });
      await act(async () => { await h.onScan!('B1'); });

      expect(h.addItem).toHaveBeenCalledTimes(1);
    });

    it('still adds only once when the reads are far apart but the code never left the frame', async () => {
      // The case a countdown gets wrong: same code, still in frame, but the
      // viewfinder took a long time to detect it. 60s is beyond any sane window.
      vi.useFakeTimers();
      try {
        render(<TillScreen />);

        await act(async () => { await h.onScan!('B1'); });
        expect(h.addItem).toHaveBeenCalledTimes(1);

        await act(async () => { await vi.advanceTimersByTimeAsync(60_000); });

        await act(async () => { await h.onScan!('B1'); });
        expect(h.addItem).toHaveBeenCalledTimes(1);
      } finally {
        vi.useRealTimers();
      }
    });

    it('counts the code again once it has actually left the frame', async () => {
      vi.useFakeTimers();
      try {
        render(<TillScreen />);

        await act(async () => { await h.onScan!('B1'); });
        expect(h.addItem).toHaveBeenCalledTimes(1);

        // The code leaves the frame and stays away past the blip threshold.
        await act(async () => { h.onNoDetection?.(); });
        await act(async () => { await vi.advanceTimersByTimeAsync(ABSENCE_MS + 100); });

        await act(async () => { await h.onScan!('B1'); });
        expect(h.addItem).toHaveBeenCalledTimes(2);
      } finally {
        vi.useRealTimers();
      }
    });

    it('ignores a single dropped frame while the code is still held in place', async () => {
      vi.useFakeTimers();
      try {
        render(<TillScreen />);

        await act(async () => { await h.onScan!('B1'); });

        // One missed detection, then the code is read again almost immediately —
        // that is a blip, not a second item.
        await act(async () => { h.onNoDetection?.(); });
        await act(async () => { await vi.advanceTimersByTimeAsync(200); });
        await act(async () => { await h.onScan!('B1'); });

        expect(h.addItem).toHaveBeenCalledTimes(1);
      } finally {
        vi.useRealTimers();
      }
    });
  });
});


describe('TillScreen — touch targets', () => {
  it('declares 44x44px minimums for quantity +/- and remove buttons', async () => {
    const { readFileSync } = await import('node:fs');
    const { fileURLToPath } = await import('node:url');
    const path = await import('node:path');
    const cssPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../index.css');
    const css = readFileSync(cssPath, 'utf-8');

    const qtyRule = css.match(/\.till-line-qty button\s*\{([^}]+)\}/)?.[1] ?? '';
    expect(qtyRule, '.till-line-qty button rule must exist').toBeTruthy();
    expect(qtyRule).toMatch(/min-height:\s*44px/);
    expect(qtyRule).toMatch(/min-width:\s*44px/);

    const removeRule = css.match(/\.till-line-remove\s*\{([^}]+)\}/)?.[1] ?? '';
    expect(removeRule, '.till-line-remove rule must exist').toBeTruthy();
    expect(removeRule).toMatch(/min-height:\s*44px/);
    expect(removeRule).toMatch(/min-width:\s*44px/);
  });

  it('renders the quantity and remove controls with accessible names', () => {
    // The basket lines only render with items in the cart.
    h.cartItems = [cartItem()];
    render(<TillScreen />);
    expect(screen.getByLabelText(/decrease quantity/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/remove/i)).toBeInTheDocument();
  });
});
