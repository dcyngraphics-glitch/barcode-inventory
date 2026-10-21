import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { InventoryScreen } from '@/screens/InventoryScreen';

// Mock useInventory
const h = vi.hoisted(() => ({
  groups: [] as Array<Record<string, unknown>>,
  loading: false,
  refresh: vi.fn(),
}));

vi.mock('@/hooks/useInventory', () => ({
  useInventory: () => ({
    groups: h.groups,
    loading: h.loading,
    refresh: h.refresh,
  }),
}));

// Mock useSettingsContext
vi.mock('@/context/SettingsContext', () => ({
  useSettingsContext: () => ({
    settings: { alertWindowDays: 3 },
  }),
}));

// Mock useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// Mock useToast
vi.mock('@/components/Toast', () => ({
  useToast: () => ({
    toasts: [],
    showToast: vi.fn(),
    dismissToast: vi.fn(),
  }),
  Toast: () => null,
}));

function renderScreen() {
  return render(
    <MemoryRouter>
      <InventoryScreen />
    </MemoryRouter>
  );
}

describe('InventoryScreen', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    h.groups = [];
    h.loading = false;
  });

  it('should render with a single h1 heading "My Inventory"', () => {
    renderScreen();
    const h1Elements = screen.getAllByRole('heading', { level: 1 });
    expect(h1Elements).toHaveLength(1);
    expect(h1Elements[0]).toHaveTextContent('My Inventory');
  });

  it('should not have any h2 or h3 before the h1', () => {
    renderScreen();
    const h1 = screen.getByRole('heading', { level: 1 });
    const headings = screen.getAllByRole('heading');
    const h1Index = headings.indexOf(h1);
    // h1 should be the first heading
    expect(h1Index).toBe(0);
  });
});

describe('InventoryScreen — token classes', () => {
  it('uses token classes for header, not inline fontSize', () => {
    renderScreen();
    const header = screen.getByRole('heading', { level: 1 });
    // No inline font-size style should be present
    expect(header).not.toHaveStyle({ fontSize: 'var(--text-2xl)' });
    // The computed font-size from CSS class is fine; only inline styles are checked
    expect(header).not.toHaveAttribute('style', expect.stringContaining('font-size'));
  });
});