import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App from '@/App';

// Mock all child components to keep the test focused on gate behaviour.
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

// The gate reads the Dexie Cloud session through this hook; drive it directly so each
// of the three states can be asserted.
const sessionMock = vi.hoisted(() => ({
  isLoading: false,
  isLoggedIn: false,
  email: null as string | null,
  error: null as string | null,
}));
vi.mock('@/hooks/useCloudSession', () => ({
  useCloudSession: () => sessionMock,
}));

// Configurable so a test can flip Cashier Mode and assert the Scan tab switches.
const settingsMock = vi.hoisted(() => ({ cashierMode: false }));
vi.mock('@/context/SettingsContext', async () => {
  const { DEFAULT_SETTINGS } = await import('@/types');
  return {
    SettingsProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
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

function renderApp() {
  return render(
    <MemoryRouter initialEntries={['/']}>
      <App />
    </MemoryRouter>,
  );
}

const signInButton = () => screen.queryByRole('button', { name: /sign in with email/i });

/**
 * Nav links only. `getAllByRole('link')` would count every link on the page, so an
 * unrelated link could make the tab-count assertion pass or fail for the wrong
 * reason. The bottom nav carries an aria-label, so scope to it.
 */
const navLinks = () =>
  within(screen.getByRole('navigation', { name: /main navigation/i })).getAllByRole('link');

describe('App Auth Gate', () => {
  beforeEach(() => {
    settingsMock.cashierMode = false;
    sessionMock.isLoading = false;
    sessionMock.isLoggedIn = false;
    sessionMock.email = null;
    sessionMock.error = null;
  });

  it('explains a storage failure instead of spinning forever', () => {
    sessionMock.error = 'Could not open local storage.';
    renderApp();

    expect(screen.getByText(/storage unavailable/i)).toBeInTheDocument();
    expect(screen.getByText(/could not open local storage/i)).toBeInTheDocument();
    expect(screen.queryByText(/loading your inventory/i)).not.toBeInTheDocument();
  });

  it('shows a splash, not the login screen, while the session is being restored', () => {
    sessionMock.isLoading = true;
    renderApp();

    expect(screen.getByText(/loading your inventory/i)).toBeInTheDocument();
    // The important part: a signed-in user must not see a login flash on cold start.
    expect(signInButton()).not.toBeInTheDocument();
    expect(screen.queryByText('Scanner Screen')).not.toBeInTheDocument();
  });

  it('shows the login gate when signed out', () => {
    renderApp();

    expect(signInButton()).toBeInTheDocument();
    expect(screen.queryByText('Scanner Screen')).not.toBeInTheDocument();
    expect(screen.queryByText('Inventory Screen')).not.toBeInTheDocument();
  });

  it('no longer shows a password field anywhere in the gate', () => {
    renderApp();

    expect(screen.queryByLabelText(/password/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /unlock/i })).not.toBeInTheDocument();
  });

  it('shows the app routes when signed in', async () => {
    sessionMock.isLoggedIn = true;
    sessionMock.email = 'me@example.com';
    renderApp();

    expect(await screen.findByText('Scanner Screen')).toBeInTheDocument();
    expect(signInButton()).not.toBeInTheDocument();
  });

  it('renders the scanner in Shop mode', async () => {
    localStorage.setItem('appMode', 'shop');
    sessionMock.isLoggedIn = true;
    renderApp();

    expect(await screen.findByText('Scanner Screen')).toBeInTheDocument();
    expect(screen.queryByText('Till Screen')).not.toBeInTheDocument();
  });
});

/**
 * Routing used to read `settings.cashierMode`, which Dexie Cloud syncs to every
 * device on the account. It now reads the device-local mode, so these tests drive
 * `localStorage` rather than the settings mock. The last case pins that change
 * explicitly, because the synced field still exists (it seeds the mode once).
 */
describe('App routing follows the app mode', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('renders the till in Sell mode', async () => {
    localStorage.setItem('appMode', 'sell');
    sessionMock.isLoggedIn = true;
    renderApp();

    expect(await screen.findByText('Till Screen')).toBeInTheDocument();
    expect(screen.queryByText('Scanner Screen')).not.toBeInTheDocument();
  });

  it('renders the receiving scanner in Shop mode', async () => {
    localStorage.setItem('appMode', 'shop');
    sessionMock.isLoggedIn = true;
    renderApp();

    expect(await screen.findByText('Scanner Screen')).toBeInTheDocument();
    expect(screen.queryByText('Till Screen')).not.toBeInTheDocument();
  });

  it('shows three nav tabs in Shop and four in Sell', async () => {
    localStorage.setItem('appMode', 'shop');
    sessionMock.isLoggedIn = true;
    const first = renderApp();
    await screen.findByText('Scanner Screen');
    expect(navLinks()).toHaveLength(3);
    first.unmount();

    localStorage.setItem('appMode', 'sell');
    renderApp();
    await screen.findByText('Till Screen');
    expect(navLinks()).toHaveLength(4);
  });

  it('ignores the synced cashierMode setting for routing', async () => {
    settingsMock.cashierMode = true;
    localStorage.setItem('appMode', 'shop');
    sessionMock.isLoggedIn = true;
    renderApp();

    expect(await screen.findByText('Scanner Screen')).toBeInTheDocument();
    expect(screen.queryByText('Till Screen')).not.toBeInTheDocument();
  });
});
