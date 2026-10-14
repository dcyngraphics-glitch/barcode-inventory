import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ModeIndicatorChip } from '@/components/ModeIndicatorChip';
import type { Settings } from '@/types';
import { DEFAULT_SETTINGS } from '@/types';

// Mock the useSettings hook to control cashierMode/sellerMode in tests
vi.mock('@/hooks/useSettings', () => ({
  useSettings: vi.fn(),
}));

import { useSettings } from '@/hooks/useSettings';

describe('ModeIndicatorChip', () => {
  it('renders cashier mode indicator when active', () => {
    const mockSettings: Settings = { ...DEFAULT_SETTINGS, cashierMode: true };
    vi.mocked(useSettings).mockReturnValue({
      settings: mockSettings,
      updateSettings: vi.fn(),
    });
    render(<ModeIndicatorChip mode="cashier" />);
    expect(screen.getByText(/cashier/i)).toHaveClass('bg-green-100 text-green-800');
  });

  it('renders seller mode indicator when active', () => {
    const mockSettings: Settings = { ...DEFAULT_SETTINGS, sellerMode: true };
    vi.mocked(useSettings).mockReturnValue({
      settings: mockSettings,
      updateSettings: vi.fn(),
    });
    render(<ModeIndicatorChip mode="seller" />);
    expect(screen.getByText(/seller/i)).toHaveClass('bg-blue-100 text-blue-800');
  });

  it('shows default state when no mode active', () => {
    const mockSettings: Settings = { ...DEFAULT_SETTINGS, cashierMode: false, sellerMode: false };
    vi.mocked(useSettings).mockReturnValue({
      settings: mockSettings,
      updateSettings: vi.fn(),
    });
    render(<ModeIndicatorChip mode="default" />);
    expect(screen.getByText(/standard/i)).toHaveClass('bg-gray-100 text-gray-800');
  });
});