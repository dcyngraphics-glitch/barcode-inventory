import { render, screen, act, within, waitFor } from '@testing-library/react';
import { ScannerScreen } from '@/screens/ScannerScreen';
import { vi } from 'vitest';

// Mock the CameraViewfinder
vi.mock('@/components/CameraViewfinder', () => {
  let scanCalled = false;
  return {
    CameraViewfinder: vi.fn(({ onScan, cameraActive }, _ref) => {
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
    // Set camera permission as granted to allow scanning in tests
    localStorage.setItem('cameraPermissionGranted', 'true');
    localStorage.setItem('permissionPromptShown', 'true');
    // Dispatch focus event to trigger the useEffect that sets cameraActive
    window.dispatchEvent(new Event('focus'));
  });

  it('should start scanning automatically on mount and stop after first successful scan', async () => {
    // Render the component
    render(<ScannerScreen />);

    // Wait for the mock camera viewfinder to be rendered
    const viewfinder = screen.getByTestId('mock-camera-viewfinder');
    expect(viewfinder).toBeInTheDocument();

    // Wait for the camera to be active (button not disabled)
    await waitFor(() => {
      const scanButton = viewfinder.querySelector('button');
      expect(scanButton).not.toBeDisabled();
    });
    act(() => {
      const scanButton = viewfinder.querySelector('button');
      if (scanButton) scanButton.click();
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

  it('should restart scanning when window gains focus after a scan', async () => {
    // Render the component
    render(<ScannerScreen />);

    // Wait for the mock camera viewfinder to be rendered
    const viewfinder = screen.getByTestId('mock-camera-viewfinder');
    expect(viewfinder).toBeInTheDocument();

    // Wait for the camera to be active (button not disabled)
    await waitFor(() => {
      const scanButton = viewfinder.querySelector('button');
      expect(scanButton).not.toBeDisabled();
    });
    act(() => {
      const scanButton = viewfinder.querySelector('button');
      if (scanButton) scanButton.click();
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
      useSettings.mockReturnValue({ settings: { cashierMode: true } });

      // Mock lookupProduct to return not-found
      lookupProduct.mockResolvedValueOnce({ success: false, reason: 'not-found', source: 'manual' });

      render(<ScannerScreen />);

      const viewfinder = screen.getByTestId('mock-camera-viewfinder');
      // Wait for the camera to be active (button not disabled)
      await waitFor(() => {
        const scanButton = viewfinder.querySelector('button');
        expect(scanButton).not.toBeDisabled();
      });
      act(() => {
        const scanButton = viewfinder.querySelector('button');
        if (scanButton) scanButton.click();
      });

      // Expect lookupProduct to have been called with the barcode
      expect(lookupProduct).toHaveBeenCalledTimes(1);
      expect(lookupProduct).toHaveBeenCalledWith('TESTBARCODE123');

      // Wait for the quick entry modal to appear
      expect(await screen.findByText('TESTBARCODE123')).toBeInTheDocument();
      expect(await screen.findByText('Quick Entry')).toBeInTheDocument();
    });

  it('should render mode toggle switch and change mode correctly', () => {
    render(<ScannerScreen />);

    // Check that the toggle switch is rendered
    const modeToggle = screen.getByRole('switch');
    expect(modeToggle).toBeInTheDocument();

    // Check initial mode is auto (aria-checked=false means auto)
    expect(modeToggle).toHaveAttribute('aria-checked', 'false');

    // Click the toggle to switch to manual
    act(() => {
      modeToggle.click();
    });

    // Now manual should be active (aria-checked=true means manual)
    expect(modeToggle).toHaveAttribute('aria-checked', 'true');

  });

  it('should not render a literal backslash-n escape as visible text', () => {
    const { container } = render(<ScannerScreen />);
    const BACKSLASH = String.fromCharCode(92);
    expect(container.textContent).not.toContain(`${BACKSLASH}n`);
  });

  it('should not offer manual barcode entry', () => {
    render(<ScannerScreen />);
    expect(screen.queryByText(/enter barcode manually/i)).toBeNull();
  });
});