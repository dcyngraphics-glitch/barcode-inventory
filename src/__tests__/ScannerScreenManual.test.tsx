import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ScannerScreen } from '@/screens/ScannerScreen';
import { lookupProduct } from '@/services/productLookupService';

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

vi.mock('@/hooks/useSettings');

const modeMock = vi.hoisted(() => ({ isSell: false }));
vi.mock('@/context/ModeContext', () => ({
  useMode: () => ({
    mode: modeMock.isSell ? 'sell' : 'shop',
    isSell: modeMock.isSell,
    setMode: vi.fn(),
    hasLoaded: true,
  }),
}));

const mockAddItem = vi.fn();
vi.mock('@/context/ScanCartContext', () => ({
  useScanCart: () => ({
    addItem: mockAddItem,
    totalItems: 0,
    totalPrice: 0,
  }),
}));

vi.mock('@/components/QuickEntryModal', () => ({
  QuickEntryModal: ({ barcode, onSave, onCancel }: any) => (
    <div data-testid="quick-entry-modal">
      QuickEntry modal for barcode: {barcode}
      <button onClick={() => onSave({ name: 'Custom', brand: 'Brand', price: 10, expiryDate: '2025-12-01' })}>
        Save
      </button>
      <button onClick={onCancel}>Cancel</button>
    </div>
  ),
}));

vi.mock('@/components/RecentScans', () => ({ RecentScans: () => <div>RecentScans</div> }));
vi.mock('@/components/PermissionPromptModal', () => ({ PermissionPromptModal: () => null }));
vi.mock('@/components/ScreenTooltip', () => ({ ScreenTooltip: () => null }));

vi.mock('@/services/productLookupService', () => ({
  lookupProduct: vi.fn(),
}));

vi.mock('@/services/inventoryService', () => ({
  addBatch: vi.fn().mockResolvedValue(undefined),
}));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    MemoryRouter: actual.MemoryRouter,
  };
});

describe('ScannerScreen TDD: Auto-scan + manual fallback (QuickEntry inventory)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    modeMock.isSell = true;
    localStorage.setItem('cameraPermissionGranted', 'true');
    localStorage.setItem('permissionPromptShown', 'true');
    window.dispatchEvent(new Event('focus'));
  });

  it('should auto-scan on mount and save unknown product to inventory via QuickEntry modal when lookup fails', async () => {
    lookupProduct.mockResolvedValueOnce({ success: false, reason: 'not-found', source: 'manual' });

    render(<ScannerScreen />);

    const viewfinder = screen.getByTestId('mock-camera-viewfinder');
    await waitFor(() => {
      expect(viewfinder).toBeInTheDocument();
    });

    act(() => {
      const scanButton = viewfinder.querySelector('button');
      if (scanButton) scanButton.click();
    });

    expect(lookupProduct).toHaveBeenCalledWith('TESTBARCODE123');

    expect(await screen.findByTestId('quick-entry-modal')).toBeInTheDocument();

    act(() => {
      const saveBtn = screen.getByRole('button', { name: /save/i });
      if (saveBtn) saveBtn.click();
    });

    await waitFor(() => {
      expect(mockAddItem).toHaveBeenCalled();
    });
    expect(mockAddItem).toHaveBeenCalledWith(expect.objectContaining({
      barcode: 'TESTBARCODE123',
      source: 'manual',
      needsInfo: false,
    }));
  });
});