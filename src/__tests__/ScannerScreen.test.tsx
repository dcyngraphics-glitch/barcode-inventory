import { render, screen, act } from '@testing-library/react';
import { ScannerScreen } from '@/screens/ScannerScreen';
import { CameraViewfinder } from '@/components/CameraViewfinder';
import { vi } from 'vitest';

// Mock the CameraViewfinder
vi.mock('@/components/CameraViewfinder', () => {
  let scanCalled = false;
  return {
    CameraViewfinder: vi.fn(({ onScan, onManualEntry, cameraActive, ...props }, ref) => {
      const active = cameraActive ?? true;
      return (
        <div data-testid="mock-camera-viewfinder">
          <button 
            onClick={() => {
              if (active && onScan) {
                onScan('TESTBARCODE123');
                scanCalled = true;
              }
            }}
            disabled={!active}
          >
            Scan
          </button>
        </div>
      );
    }),
    __getScanCalled: () => scanCalled,
    __resetScanCalled: () => { scanCalled = false; }
  };
});

// Mock useSettings
vi.mock('@/hooks/useSettings');
import { useSettings } from '@/hooks/useSettings';
useSettings.mockReturnValue({ settings: { cashierMode: false } });

// Mock useAuth
vi.mock('@/context/AuthContext', () => ({
  useAuth: () => ({
    logout: vi.fn(),
  }),
}));

// Mock useScanCart
vi.mock('@/context/ScanCartContext', () => ({
  useScanCart: () => ({
    addItem: vi.fn(),
    totalItems: 0,
    totalPrice: 0,
  }),
}));

// Mock useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// Mock productLookupService
vi.mock('@/services/productLookupService', () => ({
  lookupProduct: vi.fn()
}));

import { lookupProduct } from '@/services/productLookupService';

describe('ScannerScreen', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should start scanning automatically on mount and stop after first successful scan', () => {
    // Render the component
    render(<ScannerScreen />);

    // Wait for the mock camera viewfinder to be rendered
    const viewfinder = screen.getByTestId('mock-camera-viewfinder');
    expect(viewfinder).toBeInTheDocument();

    // Initially, the scanner should be active (because we auto-started on mount).
    // Trigger a scan
    act(() => {
      const scanButton = viewfinder.querySelector('button');
      if (scanButton) {
        scanButton.click();
      }
    });

    // Expect navigate to have been called with a product page
    expect(mockNavigate).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledWith(expect.stringContaining('/product/TESTBARCODE123'));

    // Clear the mock
    mockNavigate.mockClear();

    // Trigger a second scan
    act(() => {
      const scanButton = viewfinder.querySelector('button');
      if (scanButton) {
        scanButton.click();
      }
    });

    // Expect navigate not to have been called again
    expect(mockNavigate).toHaveBeenCalledTimes(0);
  });

  it('should restart scanning when window gains focus after a scan', () => {
    // Render the component
    render(<ScannerScreen />);

    // Wait for the mock camera viewfinder to be rendered
    const viewfinder = screen.getByTestId('mock-camera-viewfinder');
    expect(viewfinder).toBeInTheDocument();

    // Trigger first scan
    act(() => {
      const scanButton = viewfinder.querySelector('button');
      if (scanButton) {
        scanButton.click();
      }
    });

    // Expect navigate to have been called once
    expect(mockNavigate).toHaveBeenCalledTimes(1);
    mockNavigate.mockClear();

    // Simulate window gaining focus
    act(() => {
      window.dispatchEvent(new Event('focus'));
    });

    // Trigger second scan
    act(() => {
      const scanButton = viewfinder.querySelector('button');
      if (scanButton) {
        scanButton.click();
      }
    });

    // Expect navigate to have been called again
    expect(mockNavigate).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledWith(expect.stringContaining('/product/TESTBARCODE123'));
  });

  it('should show quick entry modal when product lookup fails (not-found)', async () => {
      // Override useSettings to return cashierMode: true for this test
      useSettings.mockReturnValueOnce({ settings: { cashierMode: true } });

      // Mock lookupProduct to return not-found
      lookupProduct.mockResolvedValueOnce({ success: false, reason: 'not-found', source: 'manual' });

      render(<ScannerScreen />);

      const viewfinder = screen.getByTestId('mock-camera-viewfinder');
      act(() => {
        const scanButton = viewfinder.querySelector('button');
        if (scanButton) scanButton.click();
      });

      // Wait for the quick entry modal to appear
      expect(await screen.findByText('TESTBARCODE123')).toBeInTheDocument();
      expect(await screen.findByText('Quick Entry')).toBeInTheDocument();
    });
});