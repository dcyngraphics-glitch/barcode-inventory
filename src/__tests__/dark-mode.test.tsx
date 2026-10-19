import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { LoginScreen } from '@/screens/LoginScreen';
import { ScannerScreen } from '@/screens/ScannerScreen';
import { ProductDetailScreen } from '@/screens/ProductDetailScreen';
import { CameraViewfinder } from '@/components/CameraViewfinder';

// Mock useBarcodeScanner
const mockStart = vi.fn().mockResolvedValue(undefined);
const mockStop = vi.fn();
const mockCaptureFrame = vi.fn().mockResolvedValue(null);

vi.mock('@/hooks/useBarcodeScanner', () => ({
  useBarcodeScanner: () => ({
    scanning: false,
    error: null,
    errorType: 'unknown',
    processing: false,
    hasBarcodeDetector: false,
    start: mockStart,
    stop: mockStop,
    captureFrame: mockCaptureFrame,
  }),
}));

// Mock useAuth
vi.mock('@/context/AuthContext', () => ({
  useAuth: () => ({
    cloudLogin: vi.fn(),
    cloudError: null,
  }),
}));

// Mock useScanCart
vi.mock('@/context/ScanCartContext', () => ({
  useScanCart: () => ({
    addItem: vi.fn(),
    totalItems: 0,
    totalPrice: 0,
    clear: vi.fn(),
  }),
}));

// Mock useSettings
vi.mock('@/hooks/useSettings', () => ({
  useSettings: () => ({
    settings: { theme: 'system' },
    setTheme: vi.fn(),
  }),
}));

// Mock useProductLookup
const MOCK_PRODUCT = {
  barcode: '4800016601965',
  name: 'Test Product',
  brand: 'Test Brand',
  category: 'test',
  storePrice: 10,
  defaultExpiry: '2027-01-01',
  source: 'local' as const,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  imageUrl: null,
};

vi.mock('@/hooks/useProductLookup', () => ({
  useProductLookup: () => ({
    product: MOCK_PRODUCT,
    source: 'local',
    loading: false,
    error: null,
    lookup: vi.fn(),
  }),
}));

// Mock services
vi.mock('@/services/catalogService', () => ({
  saveProduct: vi.fn(),
  updateProduct: vi.fn(),
  deleteProduct: vi.fn(),
}));

// Mock components
vi.mock('@/components/ProductManagementSheet', () => ({
  ProductManagementSheet: () => null,
}));

vi.mock('@/components/ProductForm', () => ({
  ProductForm: () => <div data-testid="product-form" />,
}));

vi.mock('@/components/ProductImage', () => ({
  ProductImage: () => <div data-testid="product-image" />,
}));

vi.mock('@/components/QuickEntryModal', () => ({
  QuickEntryModal: ({ isOpen, onCancel }) => isOpen ? <div data-testid="quick-entry-modal" onClick={onCancel} /> : null,
}));

vi.mock('@/components/ModeSegmentedControl', () => ({
  ModeSegmentedControl: () => <div data-testid="mode-segmented-control" />,
}));

vi.mock('@/components/RecentScans', () => ({
  RecentScans: () => <div data-testid="recent-scans" />,
}));

vi.mock('@/components/PermissionPromptModal', () => ({
  PermissionPromptModal: () => <div data-testid="permission-prompt-modal" />,
}));

vi.mock('@/components/ScreenTooltip', () => ({
  ScreenTooltip: () => <div data-testid="screen-tooltip" />,
}));

// Mock navigator.permissions
const mockPermissionsQuery = vi.fn().mockResolvedValue({ state: 'prompt' });
Object.defineProperty(globalThis.navigator, 'permissions', {
  value: { query: mockPermissionsQuery },
  writable: true,
  configurable: true,
});

// Mock navigator.onLine
Object.defineProperty(globalThis.navigator, 'onLine', {
  value: true,
  writable: true,
  configurable: true,
});

// Mock react-router-dom useParams
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return {
    ...actual,
    useParams: () => ({ barcode: MOCK_PRODUCT.barcode }),
    useNavigate: () => vi.fn(),
  };
});

function renderWithTheme(ui: React.ReactElement, theme: 'light' | 'dark') {
  return render(
    <MemoryRouter>
      <div data-theme={theme}>
        {ui}
      </div>
    </MemoryRouter>
  );
}

describe('Dark mode — no hardcoded colors', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPermissionsQuery.mockResolvedValue({ state: 'granted' });
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const themes = ['light', 'dark'] as const;

  for (const theme of themes) {
    it(`LoginScreen renders correctly in ${theme} mode`, () => {
      const { container } = renderWithTheme(<LoginScreen />, theme);
      
      // Verify no element has hardcoded hex color that would break in this theme
      const elements = container.querySelectorAll('*');
      for (const el of elements) {
        const style = getComputedStyle(el);
        const bg = style.backgroundColor;
        const color = style.color;
        
        // Check for white-on-white or black-on-black (signs of hardcoded colors)
        // This is a smoke test - real verification is visual
        if (theme === 'dark') {
          // In dark mode, background should not be white/light
          expect(bg).not.toBe('rgb(255, 255, 255)');
          expect(bg).not.toBe('rgb(248, 250, 252)');
        }
      }
      
      // Verify key elements exist
      expect(screen.getByRole('button', { name: /sign in with email/i })).toBeInTheDocument();
      expect(screen.getByText(/created the first time/i)).toBeInTheDocument();
    });

    it(`ScannerScreen renders correctly in ${theme} mode`, () => {
      const { container } = renderWithTheme(<ScannerScreen />, theme);
      
      // Verify key elements exist
      expect(screen.getByRole('banner')).toHaveClass('app-bar');
      expect(screen.getByRole('button', { name: /scan barcode/i })).toHaveClass('scan-fab');
      
      const elements = container.querySelectorAll('*');
      for (const el of elements) {
        const style = getComputedStyle(el);
        const bg = style.backgroundColor;
        
        if (theme === 'dark') {
          expect(bg).not.toBe('rgb(255, 255, 255)');
          expect(bg).not.toBe('rgb(248, 250, 252)');
        }
      }
    });

    it(`ProductDetailScreen renders correctly in ${theme} mode`, () => {
      const { container } = render(
        <MemoryRouter initialEntries={[`/product/${MOCK_PRODUCT.barcode}`]}>
          <div data-theme={theme}>
            <ProductDetailScreen />
          </div>
        </MemoryRouter>
      );
      
      expect(screen.getByTestId('product-image')).toBeInTheDocument();
      
      const elements = container.querySelectorAll('*');
      for (const el of elements) {
        const style = getComputedStyle(el);
        const bg = style.backgroundColor;
        
        if (theme === 'dark') {
          expect(bg).not.toBe('rgb(255, 255, 255)');
          expect(bg).not.toBe('rgb(248, 250, 252)');
        }
      }
    });

    it(`CameraViewfinder start overlay renders correctly in ${theme} mode`, () => {
      mockPermissionsQuery.mockResolvedValue({ state: 'prompt' });
      
      const { container } = render(
        <div data-theme={theme}>
          <CameraViewfinder onScan={vi.fn()} cameraActive={false} />
        </div>
      );
      
      expect(screen.getByTestId('camera-start-overlay')).toBeInTheDocument();
      expect(screen.getByText('Camera Scanner')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /start camera/i })).toHaveClass('camera-start-btn');
      
      const elements = container.querySelectorAll('*');
      for (const el of elements) {
        const style = getComputedStyle(el);
        const bg = style.backgroundColor;
        
        if (theme === 'dark') {
          expect(bg).not.toBe('rgb(255, 255, 255)');
          expect(bg).not.toBe('rgb(248, 250, 252)');
        }
      }
    });
  }
});