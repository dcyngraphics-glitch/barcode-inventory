import { useEffect, useState } from 'react';
import { Routes, Route, useLocation, Link, useNavigate } from 'react-router-dom';
import { ScanLine, Package, Settings } from 'lucide-react';
import { ScannerScreen } from '@/screens/ScannerScreen';
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
import { AuthProvider, useAuth } from '@/context/AuthContext';
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

function AuthGate() {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  if (!isAuthenticated) {
    return <LoginScreen onLogin={() => navigate('/')} />;
  }

  return <MainApp />;
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
              <Routes>
                <Route path="/" element={<ScannerScreen />} />
                <Route path="/product/:barcode" element={<ProductDetailScreen />} />
                <Route path="/inventory" element={<InventoryScreen />} />
                <Route path="/settings" element={<SettingsScreen />} />
                <Route path="/cart" element={<CartReviewScreen />} />
              </Routes>
              <BottomNav />
            </div>
            <TutorialOverlay />
          </ScanCartProvider>
        </TutorialProvider>
      </SettingsProvider>
    </ErrorBoundary>
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

  return (
    <nav className="bottom-nav" aria-label="Main navigation">
      {navItems.map((item) => {
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
