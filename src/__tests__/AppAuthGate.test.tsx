import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App from '@/App';
import { AuthProvider } from '@/context/AuthContext';

// Mock all child components to keep the test focused on auth gate behavior
vi.mock('@/screens/ScannerScreen', () => ({
  ScannerScreen: () => <div>Scanner Screen</div>,
}));
vi.mock('@/screens/InventoryScreen', () => ({
  InventoryScreen: () => <div>Inventory Screen</div>,
}));
vi.mock('@/screens/SettingsScreen', () => ({
  SettingsScreen: () => <div>Settings Screen</div>,
}));
vi.mock('@/screens/ProductDetailScreen', () => ({
  ProductDetailScreen: () => <div>Product Detail Screen</div>,
}));
vi.mock('@/screens/CartReviewScreen', () => ({
  CartReviewScreen: () => <div>Cart Review Screen</div>,
}));
vi.mock('@/screens/TillScreen', () => ({
  TillScreen: () => <div>Till Screen</div>,
}));
// Configurable so a test can flip Cashier Mode and assert the Scan tab switches.
const settingsMock = vi.hoisted(() => ({ cashierMode: false }));
vi.mock('@/context/SettingsContext', async () => {
  const { DEFAULT_SETTINGS } = await import('@/types');
  return {
    SettingsProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    // Mirrors the real provider: settings is never null, defaults are seeded
    // synchronously. (The previous mock returned null, which the real context's
    // type contract does not allow.)
    useSettingsContext: () => ({
      settings: { ...DEFAULT_SETTINGS, cashierMode: settingsMock.cashierMode },
      updateSettings: () => {},
      hasLoaded: true,
    }),
  };
});
vi.mock('@/context/TutorialContext', () => ({
  TutorialProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
vi.mock('@/context/ScanCartContext', () => ({
  ScanCartProvider: ({ children }) => <>{children}</>,
  useScanCart: () => ({ totalItems: 0, totalPrice: 0 }),
}));
vi.mock('@/components/ErrorBoundary', () => ({
  ErrorBoundary: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
vi.mock('@/components/TutorialOverlay', () => ({
  TutorialOverlay: () => <div>Tutorial Overlay</div>,
}));
vi.mock('@/hooks/useTheme', () => ({
  useTheme: () => {},
}));
vi.mock('@/services/seedService', () => ({
  seedCatalogIfEmpty: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('@/services/notificationService', () => ({
  notifyExpiringItems: vi.fn(),
  getPermissionStatus: vi.fn().mockReturnValue('default'),
}));
vi.mock('@/services/inventoryService', () => ({
  getAllBatches: vi.fn().mockResolvedValue([]),
}));

const AUTH_KEY = 'barcode_inventory_auth';
const MASTER_PASSWORD = 'test-master-123';

function renderApp() {
  return render(
    <MemoryRouter initialEntries={['/']}>
      <AuthProvider>
        <App />
      </AuthProvider>
    </MemoryRouter>
  );
}

describe('App Auth Gate', () => {
  beforeEach(() => {
    localStorage.clear();
    settingsMock.cashierMode = false;
    vi.stubEnv('VITE_MASTER_PASSWORD', MASTER_PASSWORD);
  });

  it('should show LoginScreen when not authenticated', () => {
    renderApp();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /unlock/i })).toBeInTheDocument();
  });

  it('should not show app routes when not authenticated', () => {
    renderApp();
    expect(screen.queryByText('Scanner Screen')).not.toBeInTheDocument();
    expect(screen.queryByText('Inventory Screen')).not.toBeInTheDocument();
  });

  it('should show app routes when authenticated via localStorage', async () => {
    localStorage.setItem(AUTH_KEY, 'true');
    renderApp();
    expect(screen.queryByLabelText(/password/i)).not.toBeInTheDocument();
    expect(await screen.findByText('Scanner Screen')).toBeInTheDocument();
  });

  it('should show app routes after successful login', async () => {
    renderApp();
    const input = screen.getByLabelText('Password');
    const button = screen.getByRole('button', { name: /unlock/i });

    fireEvent.change(input, { target: { value: MASTER_PASSWORD } });
    fireEvent.click(button);

    // After login, the app should be visible (wait for seeding to finish)
    await waitFor(() => {
      expect(screen.queryByLabelText(/password/i)).not.toBeInTheDocument();
    });
    expect(await screen.findByText('Scanner Screen')).toBeInTheDocument();
  });

  it('should stay on login screen after failed login', () => {
    renderApp();
    const input = screen.getByLabelText('Password');
    const button = screen.getByRole('button', { name: /unlock/i });

    fireEvent.change(input, { target: { value: 'wrong-password' } });
    fireEvent.click(button);

    expect(screen.getByLabelText('Password')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.queryByText('Scanner Screen')).not.toBeInTheDocument();
  });

  it('renders the till on the Scan tab when Cashier Mode is on', async () => {
    settingsMock.cashierMode = true;
    localStorage.setItem(AUTH_KEY, 'true');
    renderApp();

    expect(await screen.findByText('Till Screen')).toBeInTheDocument();
    expect(screen.queryByText('Scanner Screen')).not.toBeInTheDocument();
  });

  it('renders the receiving scanner when Cashier Mode is off', async () => {
    settingsMock.cashierMode = false;
    localStorage.setItem(AUTH_KEY, 'true');
    renderApp();

    expect(await screen.findByText('Scanner Screen')).toBeInTheDocument();
    expect(screen.queryByText('Till Screen')).not.toBeInTheDocument();
  });
});
