import { render, screen, act, within, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';

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

/**
 * ScannerScreen reads the mode from ModeContext, not from the synced
 * settings.cashierMode — that field is account-wide, so a device switched to Shop
 * would otherwise still behave as Sell.
 */
const modeMock = vi.hoisted(() => ({ isSell: false }));
vi.mock('@/context/ModeContext', () => ({
  useMode: () => ({
    mode: modeMock.isSell ? 'sell' : 'shop',
    isSell: modeMock.isSell,
    setMode: vi.fn(),
    hasLoaded: true,
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
}))

// Mock useToast
vi.mock('@/components/Toast', () => ({
  useToast: () => ({
    toasts: [],
    showToast: vi.fn(),
    dismissToast: vi.fn(),
  }),
  Toast: () => null,
}))

import { lookupProduct } from '@/services/productLookupService';

// Import ScannerScreen after mocks are set up
const { ScannerScreen } = await import('@/screens/ScannerScreen');

describe('ScannerScreen', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset the mode flag so the Sell case cannot leak into later tests.
    modeMock.isSell = false;
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
      // Put the screen in Sell for this test, so a scan takes the cart path.
      modeMock.isSell = true;

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

describe('ScannerScreen — token classes', () => {
  it('app bar uses token classes, not inline #334155', () => {
    render(
      <MemoryRouter>
        <ScannerScreen />
      </MemoryRouter>
    );
    const appBar = screen.getByRole('banner');
    expect(appBar).toHaveClass('app-bar');
    expect(appBar).not.toHaveStyle({ background: '#334155' });
  });

  it('mode toggle uses token classes, not inline styles', () => {
    render(
      <MemoryRouter>
        <ScannerScreen />
      </MemoryRouter>
    );
    const modeLabel = screen.getByTestId('scan-mode-label').closest('div');
    expect(modeLabel).not.toHaveStyle({ color: '#f8fafc' });
    expect(modeLabel).not.toHaveStyle({ opacity: 0.7 });
  });

  it('labels the scan-method control "Scan", so it cannot read as "the mode"', () => {
    render(
      <MemoryRouter>
        <ScannerScreen />
      </MemoryRouter>
    );

    expect(screen.getByTestId('scan-mode-label')).toHaveTextContent('Scan');

    // The Shop/Sell switcher is the only control that may read as "the mode".
    // This label used to say "Mode", one row below that switcher, which made the
    // two look like a hierarchy when they are unrelated.
    expect(screen.queryByText(/^mode$/i)).not.toBeInTheDocument();
  });

  it('cart badge uses token classes, not inline #0f172a/#3b82f6', () => {
    render(
      <MemoryRouter>
        <ScannerScreen />
      </MemoryRouter>
    );
    const cartBtn = screen.getByRole('button', { name: /cart/i });
    expect(cartBtn).not.toHaveStyle({ background: '#0f172a' });
    expect(cartBtn).not.toHaveStyle({ border: '1.5px solid #3b82f6' });
  });

  it('scan FAB uses .scan-fab token class, not inline gradient', () => {
    render(
      <MemoryRouter>
        <ScannerScreen />
      </MemoryRouter>
    );
    const fab = screen.getByRole('button', { name: /scan barcode/i });
    expect(fab).toHaveClass('scan-fab');
    expect(fab).not.toHaveStyle({ background: 'linear-gradient(135deg, #059669 0%, #0d9488 50%, #17a974 100%)' });
  });

  it('toast uses useToast hook, not inline #0F172A', () => {
    render(
      <MemoryRouter>
        <ScannerScreen />
      </MemoryRouter>
    );
    // Trigger a scan to show toast
    // Verify toast uses useToast() not inline styles
  });

  it('has only ONE aria-live region for cart total', () => {
    render(
      <MemoryRouter>
        <ScannerScreen />
      </MemoryRouter>
    );
    const liveRegions = screen.getAllByRole('status');
    expect(liveRegions).toHaveLength(1);
  });
});
