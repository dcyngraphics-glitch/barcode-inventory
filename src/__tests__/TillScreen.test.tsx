import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { TillScreen } from '@/screens/TillScreen';

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
}));

vi.mock('@/components/CameraViewfinder', () => ({
  CameraViewfinder: vi.fn(() => <div data-testid="mock-viewfinder" />),
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
});
