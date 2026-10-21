import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { TillScreen } from '@/screens/TillScreen';
import { SalesScreen } from '@/screens/SalesScreen';

// ---------------------------------------------------------------------------
// WCAG 1.3.1 — each screen needs a programmatic heading so a screen-reader
// user can tell where they are. The visual Till header was deliberately removed
// to reclaim vertical space, so the heading is visually hidden (.sr-only) rather
// than re-added as a visible title.
//
// The mock setups below mirror src/__tests__/TillScreen.test.tsx and
// src/__tests__/SalesScreen.test.tsx — including the vi.hoisted pattern that keeps
// the ScanCart stub state available inside the hoisted vi.mock factories.
// ---------------------------------------------------------------------------

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
  isSell: true,
  hasLoaded: true,
  setMode: vi.fn(),
  dayKeys: [] as string[],
  sales: [] as Array<Record<string, unknown>>,
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

vi.mock('@/context/ModeContext', () => ({
  useMode: () => ({
    mode: h.isSell ? 'sell' : 'shop',
    isSell: h.isSell,
    setMode: h.setMode,
    hasLoaded: h.hasLoaded,
  }),
}));

vi.mock('@/services/saleService', () => ({
  recordSale: h.recordSale,
  undoLastSale: h.undoLastSale,
  getDayKeys: vi.fn(async () => h.dayKeys),
  getSalesForDay: vi.fn(async () => h.sales),
  summarizeDay: vi.fn(() => ({ total: 0, saleCount: 0, itemCount: 0, topSellers: [], shortfalls: [] })),
}));

vi.mock('@/services/productLookupService', () => ({
  lookupProduct: h.lookupProduct,
}));

describe('screen headings (WCAG 1.3.1)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    h.cartItems = [];
    h.isSell = true;
    h.hasLoaded = true;
    h.dayKeys = [];
    h.sales = [];
  });

  it('gives TillScreen exactly one h1', () => {
    const { container } = render(<TillScreen />);

    const h1s = container.querySelectorAll('h1');
    expect(h1s).toHaveLength(1);
    expect(h1s[0].textContent).toBe('Point of Sale');
  });

  it('gives SalesScreen exactly one h1', async () => {
    const { container } = render(
      <MemoryRouter initialEntries={['/sales']}>
        <SalesScreen />
      </MemoryRouter>,
    );

    const h1s = container.querySelectorAll('h1');
    expect(h1s).toHaveLength(1);
    expect(h1s[0].textContent).toBe('Sales Report');
  });

  it('hides each screen heading visually but keeps it exposed to the accessibility tree', () => {
    const { container } = render(<TillScreen />);

    const tillHeading = screen.getByRole('heading', { level: 1, name: 'Point of Sale' });
    expect(tillHeading.className).toContain('sr-only');

    expect(container.querySelector('.till-screen > h1')).not.toBeNull();
  });
});
