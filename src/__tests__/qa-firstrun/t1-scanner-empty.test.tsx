import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ScannerScreen } from '@/screens/ScannerScreen';

vi.mock('@/components/CameraViewfinder', () => ({
  CameraViewfinder: ({ onScan }: { onScan: (barcode: string) => void }) => (
    <div data-testid="mock-camera-viewfinder">
      <button
        onClick={() => onScan('TESTBARCODE123')}
        disabled={false}
      >
        Scan
      </button>
    </div>
  ),
}));

vi.mock('@/context/ModeContext', () => ({
  useMode: () => ({
    mode: 'shop',
    isSell: false,
    setMode: vi.fn(),
    hasLoaded: true,
  }),
}));

vi.mock('@/context/ScanCartContext', () => ({
  useScanCart: () => ({
    addItem: vi.fn(),
    totalItems: 0,
    totalPrice: 0,
    removeItem: vi.fn(),
    updateItem: vi.fn(),
    clearCart: vi.fn(),
  }),
}));

vi.mock('react-router-dom', async (importOriginal) => {
  const original = await importOriginal();
  return {
    ...original,
    useNavigate: () => vi.fn(),
  };
});

describe('ScannerScreen - Empty state on first run', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('renders without crashing on first run', () => {
    render(
      <MemoryRouter>
        <ScannerScreen />
      </MemoryRouter>
    );
    expect(screen.getByTestId('mock-camera-viewfinder')).toBeInTheDocument();
  });
});