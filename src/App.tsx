import { useEffect, useState } from 'react';
import { Routes, Route, useLocation, Link } from 'react-router-dom';
import { ScanLine, Package, Settings, Receipt, AlertTriangle } from 'lucide-react';
import { ScannerScreen } from '@/screens/ScannerScreen';
import { TillScreen } from '@/screens/TillScreen';
import { SalesScreen } from '@/screens/SalesScreen';
import { InventoryScreen } from '@/screens/InventoryScreen';
import { SettingsScreen } from '@/screens/SettingsScreen';
import { ProductDetailScreen } from '@/screens/ProductDetailScreen';
import { CartReviewScreen } from '@/screens/CartReviewScreen';
import { LoginScreen } from '@/screens/LoginScreen';
import { SettingsProvider, useSettingsContext } from '@/context/SettingsContext';
import { TutorialProvider } from '@/context/TutorialContext';
import { TutorialOverlay } from '@/components/TutorialOverlay';
import { ScanCartProvider, useScanCart } from '@/context/ScanCartContext';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { AuthProvider } from '@/context/AuthContext';
import { useCloudSession } from '@/hooks/useCloudSession';
import { UserInteractionPrompt } from '@/components/UserInteractionPrompt';
import { useTheme } from '@/hooks/useTheme';
import { seedCatalogIfEmpty } from '@/services/seedService';
import { notifyExpiringItems, getPermissionStatus } from '@/services/notificationService';
import { getAllBatches } from '@/services/inventoryService';
import { InstallPromotionBanner } from '@/components/InstallPromotionBanner';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export default function App() {
  return (
    <AuthProvider>
      <AuthGate />
    </AuthProvider>
  );
}

/**
 * The app's gate: nobody reaches the scanner without a Dexie Cloud account.
 *
 * Three states, because "not signed in yet" and "still reading the session from
 * storage" are different: db.cloud.currentUser starts as UNAUTHORIZED_USER with
 * isLoading:true, and rendering the login screen during that window would flash it on
 * every cold start for users who are perfectly well signed in.
 */
function AuthGate() {
  const { isLoading, isLoggedIn, error } = useCloudSession();

  return (
    <>
      {isLoading ? (
        <div className="screen-center">
          <div className="loading-spinner" role="status" aria-label="Loading">
            <div className="spinner" />
            <p>Loading your inventory...</p>
          </div>
        </div>
      ) : error ? (
        // The local database is the app. If it cannot be opened there is nothing useful
        // to show, so say so plainly instead of spinning forever.
        <div className="screen-center">
          <div className="login-card">
            <div className="login-logo">
              <AlertTriangle size={40} />
            </div>
            <h1>Storage unavailable</h1>
            <p className="login-subtitle">{error}</p>
          </div>
        </div>
      ) : isLoggedIn ? (
        <MainApp />
      ) : (
        <LoginScreen />
      )}

      {/* Mounted at the root, not inside a branch, so db.cloud.userInteraction is
          always observed — the "unsynced changes" logout confirmation can fire from
          any screen, and the login prompts need it while signed out. */}
      <UserInteractionPrompt />
    </>
  );
}

function MainApp() {
  const [isSeeding, setIsSeeding] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const seedTimer = setTimeout(() => {
      if (!cancelled) {
        console.warn('App: catalog seeding timed out after 8s, continuing');
        setIsSeeding(false);
      }
    }, 8000);
    seedCatalogIfEmpty()
      .then(() => {
        clearTimeout(seedTimer);
        if (!cancelled) setIsSeeding(false);
      })
      .catch((err) => {
        clearTimeout(seedTimer);
        console.error('App: catalog seeding failed, continuing without seed:', err);
        if (!cancelled) setIsSeeding(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (isSeeding) {
    return (
      <div className="screen-center">
        <div className="loading-spinner" role="status" aria-label="Loading">
          <div className="spinner" />
          <p>Setting up catalog...</p>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <SettingsProvider>
        <ThemeAndNotifications />
        <TutorialProvider>
          <ScanCartProvider>
            <InstallBanner />
            <div className="app-container">
              <AppRoutes />
              <BottomNav />
            </div>
            <TutorialOverlay />
          </ScanCartProvider>
        </TutorialProvider>
      </SettingsProvider>
    </ErrorBoundary>
  );
}

/** Route selection lives inside SettingsProvider so it can read cashierMode:
 *  with Cashier Mode on, the Scan tab IS the till. */
function AppRoutes() {
  const { settings, hasLoaded } = useSettingsContext();

  return (
    <Routes>
      {/* Hold the first paint until settings are read, so a cashier-mode user
          doesn't get a flash of the scanner (and a camera prompt) on cold start. */}
      <Route
        path="/"
        element={!hasLoaded ? null : settings.cashierMode ? <TillScreen /> : <ScannerScreen />}
      />
      <Route path="/product/:barcode" element={<ProductDetailScreen />} />
      <Route path="/inventory" element={<InventoryScreen />} />
      <Route path="/settings" element={<SettingsScreen />} />
      <Route path="/cart" element={<CartReviewScreen />} />
      <Route path="/sales" element={<SalesScreen />} />
    </Routes>
  );
}

function InstallBanner() {
  const { totalItems } = useScanCart();
  const [installPromptEvent, setInstallPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);

  // Install promotion logic
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      // Stash the event so it can be triggered later.
      setInstallPromptEvent(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  useEffect(() => {
    if (totalItems >= 3 && installPromptEvent !== null) {
      setShowInstallBanner(true);
    }
  }, [totalItems, installPromptEvent]);

  const handleInstall = async () => {
    if (installPromptEvent) {
      // Show the prompt
      installPromptEvent.prompt();
      // Wait for the user to respond to the prompt
      const { outcome } = await installPromptEvent.userChoice;
      // Optionally, send analytics event
      console.log(`Install promotion outcome: ${outcome}`);
      // We've used the prompt, can't reuse it
      setInstallPromptEvent(null);
      setShowInstallBanner(false);
    }
  };

  const handleClose = () => {
    setInstallPromptEvent(null);
    setShowInstallBanner(false);
  };

  if (!showInstallBanner) return null;

  return (
    <InstallPromotionBanner
      visible={showInstallBanner}
      onInstall={handleInstall}
      onClose={handleClose}
    />
  );
}

function ThemeAndNotifications() {
  useTheme();
  return <NotificationChecker />;
}

function NotificationChecker() {
  const { settings } = useSettingsContext();
  useEffect(() => {
    if (!settings?.notificationsEnabled) return;
    if (getPermissionStatus() !== 'granted') return;
    const alertWindowDays = settings.alertWindowDays ?? 3;
    getAllBatches()
      .then((batches) => notifyExpiringItems(batches, alertWindowDays))
      .catch((err) => {
        console.error('Failed to check expiring items for notifications:', err);
      });
  }, [settings?.notificationsEnabled, settings?.alertWindowDays]);

  useEffect(() => {
    if (!settings?.notificationsEnabled) return;
    if (getPermissionStatus() !== 'granted') return;
    const id = setInterval(() => {
      const alertWindowDays = settings.alertWindowDays ?? 3;
      getAllBatches()
        .then((batches) => notifyExpiringItems(batches, alertWindowDays))
        .catch(() => {});
    }, 60 * 60 * 1000);
    return () => clearInterval(id);
  }, [settings?.notificationsEnabled, settings?.alertWindowDays]);
  return null;
}

const navItems = [
  { path: '/', icon: ScanLine, label: 'Scan' },
  { path: '/inventory', icon: Package, label: 'Inventory' },
  { path: '/settings', icon: Settings, label: 'Settings' },
];

function BottomNav() {
  const location = useLocation();
  const { settings } = useSettingsContext();

  // Sales only exists in Cashier Mode — without a till there is nothing to report.
  const items = settings.cashierMode
    ? [
        { path: '/', icon: ScanLine, label: 'Scan' },
        { path: '/sales', icon: Receipt, label: 'Sales' },
        { path: '/inventory', icon: Package, label: 'Inventory' },
        { path: '/settings', icon: Settings, label: 'Settings' },
      ]
    : navItems;

  return (
    <nav className="bottom-nav" aria-label="Main navigation">
      {items.map((item) => {
        const isActive = item.path === '/'
          ? location.pathname === '/' || location.pathname.startsWith('/product') || location.pathname.startsWith('/cart')
          : location.pathname.startsWith(item.path);
        return (
          <Link
            key={item.path}
            to={item.path}
            className={`bottom-nav-item${isActive ? ' active' : ''}`}
            aria-current={isActive ? 'page' : undefined}
          >
            <item.icon size={24} />
            <span className="bottom-nav-label">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
