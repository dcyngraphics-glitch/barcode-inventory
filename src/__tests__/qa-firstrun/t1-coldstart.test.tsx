import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App from '@/App';

/**
 * Cold start / AuthGate.
 *
 * The gate has three terminal states: loading (spinner), storage error, and
 * then either the login screen or the app. The question this file answers is
 * whether the app can ever get STUCK on the spinner, and whether a storage
 * failure is surfaced instead of hanging.
 */

const sessionMock = vi.hoisted(() => ({
  isLoading: false,
  isLoggedIn: false,
  email: null as string | null,
  error: null as string | null,
}));

vi.mock('@/hooks/useCloudSession', () => ({
  useCloudSession: () => sessionMock,
}));

vi.mock('@/screens/ScannerScreen', () => ({ ScannerScreen: () => <div>Scanner Screen</div> }));
vi.mock('@/screens/InventoryScreen', () => ({ InventoryScreen: () => <div>Inventory Screen</div> }));
vi.mock('@/screens/SettingsScreen', () => ({ SettingsScreen: () => <div>Settings Screen</div> }));
vi.mock('@/screens/ProductDetailScreen', () => ({ ProductDetailScreen: () => <div>Product Detail</div> }));
vi.mock('@/screens/CartReviewScreen', () => ({ CartReviewScreen: () => <div>Cart Review</div> }));
vi.mock('@/screens/TillScreen', () => ({ TillScreen: () => <div>Till Screen</div> }));
vi.mock('@/screens/SalesScreen', () => ({ SalesScreen: () => <div>Sales Screen</div> }));

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

function renderApp(path = '/') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>
  );
}

describe('Cold start / AuthGate', () => {
  beforeEach(() => {
    sessionMock.isLoading = false;
    sessionMock.isLoggedIn = false;
    sessionMock.email = null;
    sessionMock.error = null;
    settingsMock.cashierMode = false;
  });

  it('shows a loading spinner while the session is being restored', () => {
    sessionMock.isLoading = true;
    renderApp();
    expect(screen.getByRole('status', { name: /loading/i })).toBeInTheDocument();
    expect(screen.getByText(/loading your inventory/i)).toBeInTheDocument();
  });

  it('does NOT show the login screen while loading (no flash on cold start)', () => {
    sessionMock.isLoading = true;
    renderApp();
    expect(screen.queryByText(/sign in with email/i)).not.toBeInTheDocument();
  });

  it('shows the login screen when the session resolves to signed-out', () => {
    sessionMock.isLoading = false;
    sessionMock.isLoggedIn = false;
    renderApp();
    expect(screen.getByRole('button', { name: /sign in with email/i })).toBeInTheDocument();
  });

  it('shows the app when the session resolves to signed-in', () => {
    sessionMock.isLoading = false;
    sessionMock.isLoggedIn = true;
    sessionMock.email = 'shop@example.com';
    renderApp();
    expect(screen.getByText(/setting up catalog/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /sign in with email/i })).not.toBeInTheDocument();
  });

  it('surfaces a storage error instead of spinning forever', () => {
    sessionMock.isLoading = false;
    sessionMock.error = 'IndexedDB is blocked in this browser';
    renderApp();
    expect(screen.getByText(/storage unavailable/i)).toBeInTheDocument();
    expect(screen.getByText(/indexeddb is blocked/i)).toBeInTheDocument();
    // No spinner in the error state.
    expect(screen.queryByRole('status', { name: /loading/i })).not.toBeInTheDocument();
  });

  it('prefers the error state over the signed-in state when both are set', () => {
    sessionMock.isLoading = false;
    sessionMock.isLoggedIn = true;
    sessionMock.error = 'boom';
    renderApp();
    expect(screen.getByText(/storage unavailable/i)).toBeInTheDocument();
    expect(screen.queryByText('Scanner Screen')).not.toBeInTheDocument();
  });

  it('prefers the loading state over the error state while loading', () => {
    sessionMock.isLoading = true;
    sessionMock.error = 'boom';
    renderApp();
    expect(screen.getByRole('status', { name: /loading/i })).toBeInTheDocument();
    expect(screen.queryByText(/storage unavailable/i)).not.toBeInTheDocument();
  });

  it('never renders the login screen AND the app at the same time', () => {
    sessionMock.isLoading = false;
    sessionMock.isLoggedIn = false;
    renderApp();
    expect(screen.getByRole('button', { name: /sign in with email/i })).toBeInTheDocument();
    expect(screen.queryByText('Scanner Screen')).not.toBeInTheDocument();
  });
});