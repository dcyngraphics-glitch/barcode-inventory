import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { SalesScreen } from '@/screens/SalesScreen';

// SalesScreen reads the device-local mode, not the synced cashierMode setting.
const h = vi.hoisted(() => ({
  isSell: true,
  hasLoaded: true,
  setMode: vi.fn(),
  dayKeys: [] as string[],
  sales: [] as Array<Record<string, unknown>>,
}));

vi.mock('@/context/ModeContext', () => ({
  useMode: () => ({
    mode: h.isSell ? 'sell' : 'shop',
    isSell: h.isSell,
    setMode: h.setMode,
    hasLoaded: h.hasLoaded,
  }),
}));

// Keep the real summarizeDay; only stub the IndexedDB reads.
vi.mock('@/services/saleService', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/services/saleService')>();
  return {
    ...actual,
    getDayKeys: vi.fn(async () => h.dayKeys),
    getSalesForDay: vi.fn(async () => h.sales),
  };
});

const sale = (over: Record<string, unknown> = {}) => ({
  saleId: 's1',
  soldAt: '2026-10-15T10:00:00.000Z',
  dayKey: '2026-10-15',
  total: 25,
  itemCount: 2,
  lines: [
    {
      barcode: 'B1',
      name: 'Bear Brand',
      brand: 'Bear Brand',
      unitPrice: 12.5,
      quantity: 2,
      lineTotal: 25,
      deductions: [],
      shortfall: 0,
    },
  ],
  ...over,
});

function waitForElement(query: () => Element | null): Promise<Element> {
  let el: Element | null = null;
  return waitFor(
    () => {
      el = query();
      if (!el) throw new Error('element not found');
      return el;
    },
    {},
  ).then(() => el as Element);
}

function renderScreen() {
  return render(
    <MemoryRouter initialEntries={['/sales']}>
      <SalesScreen />
    </MemoryRouter>,
  );
}

describe('SalesScreen', () => {
  beforeEach(() => {
    h.isSell = true;
    h.hasLoaded = true;
    h.setMode.mockClear();
    h.dayKeys = [];
    h.sales = [];
  });

  it('shows a skeleton while the mode is loading, instead of bouncing to /', async () => {
    // The stored mode arrives a tick after mount; acting on the default here is
    // what used to kick a Sell user off /sales on every reload.
    h.isSell = false;
    h.hasLoaded = false;

    renderScreen();
    await new Promise((r) => setTimeout(r, 60));

    // A skeleton — not a blank frame, and not a redirect.
    expect(screen.getByTestId('loading-skeleton')).toBeInTheDocument();
    expect(screen.queryByText(/No sales recorded/i)).not.toBeInTheDocument();
  });

  it('offers a one-tap switch in Shop mode, instead of redirecting silently', async () => {
    h.isSell = false;
    h.hasLoaded = true;

    renderScreen();

    const cta = await screen.findByRole('button', { name: /switch to sell/i });
    expect(screen.getByText(/sales lives in sell/i)).toBeInTheDocument();

    fireEvent.click(cta);
    expect(h.setMode).toHaveBeenCalledWith('sell');
  });

  it("shows today's total and sale count", async () => {
    h.sales = [sale()];

    renderScreen();

    // ₱25.00 appears in the summary, the sale head and the line — scope the query.
    const summary = await waitForElement(() => document.querySelector('.sales-summary'));
    expect(summary?.textContent).toContain('₱25.00');
    expect(summary?.textContent).toContain('1 sale · 2 items');
  });

  it('shows an empty state when the day has no sales', async () => {
    renderScreen();

    expect(await screen.findByText(/No sales recorded for today/i)).toBeInTheDocument();
  });

  it('lists past days and shows one when selected', async () => {
    // 2026-10-14 would render as "Yesterday" (today is the 15th); go further back.
    h.dayKeys = ['2026-10-15', '2026-10-13'];
    h.sales = [sale()];

    renderScreen();

    const past = await screen.findByRole('tab', { name: /Oct 13/i });
    fireEvent.click(past);

    await waitFor(() => expect(past).toHaveAttribute('aria-selected', 'true'));
    expect(document.querySelector('.sales-summary')?.textContent).toContain('Oct 13');
    expect(document.querySelector('.sales-summary')?.textContent).toContain('₱25.00');
  });

  it('flags items sold without stock', async () => {
    h.sales = [
      sale({
        lines: [
          {
            barcode: 'GHOST',
            name: 'Unknown (GHOST)',
            brand: '',
            unitPrice: 5,
            quantity: 3,
            lineTotal: 15,
            deductions: [],
            shortfall: 3,
          },
        ],
      }),
    ];

    renderScreen();

    // The name appears in the shortfall row and again in the sale's line list.
    const flag = await screen.findByText('Sold without stock');
    const flagSection = flag.closest('section');
    expect(flagSection?.textContent).toContain('Unknown (GHOST)');
  });

  it('shows top sellers', async () => {
    h.sales = [sale()];

    renderScreen();

    expect(await screen.findByText('Top sellers')).toBeInTheDocument();
    expect(screen.getByText('Bear Brand')).toBeInTheDocument();
  });
});
