import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App from '@/App';

// The banner's trigger logic lives inside App, so App is rendered with everything
// around it mocked away.

vi.mock('@/screens/ScannerScreen', () => ({ ScannerScreen: () => <div>Scanner Screen</div> }));
vi.mock('@/screens/TillScreen', () => ({ TillScreen: () => <div>Till Screen</div> }));
vi.mock('@/screens/InventoryScreen', () => ({ InventoryScreen: () => <div>Inventory Screen</div> }));
vi.mock('@/screens/SettingsScreen', () => ({ SettingsScreen: () => <div>Settings Screen</div> }));
vi.mock('@/screens/ProductDetailScreen', () => ({ ProductDetailScreen: () => <div>Product Detail Screen</div> }));
vi.mock('@/screens/CartReviewScreen', () => ({ CartReviewScreen: () => <div>Cart Review Screen</div> }));
vi.mock('@/screens/LoginScreen', () => ({ LoginScreen: () => <div>Login Screen</div> }));
vi.mock('@/screens/SalesScreen', () => ({ SalesScreen: () => <div>Sales Screen</div> }));

const sessionMock = vi.hoisted(() => ({ isLoading: false, isLoggedIn: true, email: 'me@example.com', error: null as string | null }));
vi.mock('@/hooks/useCloudSession', () => ({ useCloudSession: () => sessionMock }));

vi.mock('@/context/SettingsContext', async () => {
  const { DEFAULT_SETTINGS } = await import('@/types');
  return {
    SettingsProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    useSettingsContext: () => ({
      settings: { ...DEFAULT_SETTINGS },
      updateSettings: () => {},
      hasLoaded: true,
    }),
  };
});
vi.mock('@/context/TutorialContext', () => ({
  TutorialProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
vi.mock('@/components/TutorialOverlay', () => ({ TutorialOverlay: () => null }));
vi.mock('@/components/ErrorBoundary', () => ({ ErrorBoundary: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
vi.mock('@/components/UserInteractionPrompt', () => ({ UserInteractionPrompt: () => null }));
vi.mock('@/hooks/useTheme', () => ({ useTheme: () => {} }));
vi.mock('@/services/seedService', () => ({ seedCatalogIfEmpty: vi.fn().mockResolvedValue(undefined) }));
vi.mock('@/services/notificationService', () => ({
  notifyExpiringItems: vi.fn(),
  getPermissionStatus: vi.fn().mockReturnValue('default'),
}));
vi.mock('@/services/inventoryService', () => ({ getAllBatches: vi.fn().mockResolvedValue([]) }));

/**
 * Shop mode, deliberately: the Sell-mode cart is what the old trigger read, so a
 * Sell-shaped cart here would hide the regression this file exists to pin.
 */
vi.mock('@/context/ScanCartContext', () => ({
  ScanCartProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useScanCart: () => ({ items: [], totalItems: 0, totalPrice: 0, clearCart: () => {} }),
}));

// Render a marker so the test can assert on visibility without the real banner's copy.
vi.mock('@/components/InstallPromotionBanner', () => ({
  InstallPromotionBanner: ({ visible }: { visible: boolean }) =>
    visible ? <div data-testid="install-banner">Install the app</div> : null,
}));

/** A minimal stand-in for the browser's BeforeInstallPromptEvent. */
class FakeInstallPromptEvent extends Event {
  prompt = vi.fn().mockResolvedValue(undefined);
  userChoice = Promise.resolve({ outcome: 'accepted' as const, platform: 'web' });
  constructor() {
    super('beforeinstallprompt');
  }
}

function renderApp() {
  return render(
    <MemoryRouter initialEntries={['/']}>
      <App />
    </MemoryRouter>,
  );
}

function fireInstallPrompt() {
  act(() => {
    window.dispatchEvent(new FakeInstallPromptEvent());
  });
}

const banner = () => screen.queryByTestId('install-banner');

describe('Install banner trigger', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionMock.isLoading = false;
    sessionMock.isLoggedIn = true;
    sessionMock.error = null;
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('does not interrupt a first-time user', async () => {
    renderApp();
    await screen.findByText('Scanner Screen');
    fireInstallPrompt();

    expect(banner()).not.toBeInTheDocument();
  });

  it('appears on the third visit, once the browser offers the prompt', async () => {
    localStorage.setItem('installBannerVisits', '2');
    renderApp();
    await screen.findByText('Scanner Screen');
    fireInstallPrompt();

    expect(await screen.findByTestId('install-banner')).toBeInTheDocument();
  });

  /**
   * The regression: the banner used to be gated on `totalItems >= 3`, where
   * totalItems is the Sell-mode cart — which is permanently empty in Shop mode, so
   * the banner could never appear for the default user.
   */
  it('appears in Shop mode with an empty cart', async () => {
    localStorage.setItem('installBannerVisits', '2');
    renderApp();
    await screen.findByText('Scanner Screen');

    // Still Shop: the till is what populates the cart.
    expect(screen.queryByText('Till Screen')).not.toBeInTheDocument();
    fireInstallPrompt();

    expect(await screen.findByTestId('install-banner')).toBeInTheDocument();
  });

  it('stays hidden when the browser never offers an install prompt', async () => {
    localStorage.setItem('installBannerVisits', '9');
    renderApp();
    await screen.findByText('Scanner Screen');

    expect(banner()).not.toBeInTheDocument();
  });
});
