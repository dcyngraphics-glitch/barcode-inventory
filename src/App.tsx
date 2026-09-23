import { useEffect, useState } from 'react';
import { Routes, Route, useLocation, Link } from 'react-router-dom';
import { ScanLine, Package, Settings } from 'lucide-react';
import { ScannerScreen } from '@/screens/ScannerScreen';
import { InventoryScreen } from '@/screens/InventoryScreen';
import { SettingsScreen } from '@/screens/SettingsScreen';
import { ProductDetailScreen } from '@/screens/ProductDetailScreen';
import { CartReviewScreen } from '@/screens/CartReviewScreen';
import { SettingsProvider, useSettingsContext } from '@/context/SettingsContext';
import { TutorialProvider } from '@/context/TutorialContext';
import { TutorialOverlay } from '@/components/TutorialOverlay';
import { ScanCartProvider } from '@/context/ScanCartContext';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { useTheme } from '@/hooks/useTheme';
import { seedCatalogIfEmpty } from '@/services/seedService';
import { notifyExpiringItems, getPermissionStatus } from '@/services/notificationService';
import { getAllBatches } from '@/services/inventoryService';
import { AuthProvider } from '@/context/AuthContext';
import { ProtectedRoute } from '@/components/ProtectedRoute';

export default function App() {
  const [isSeeding, setIsSeeding] = useState(true);

  useEffect(() => {
    seedCatalogIfEmpty()
      .finally(() => setIsSeeding(false));
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
      <AuthProvider>
        <SettingsProvider>
          <ThemeAndNotifications />
          <TutorialProvider>
            <ScanCartProvider>
              <ProtectedRoute>
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
              </ProtectedRoute>
            </ScanCartProvider>
          </TutorialProvider>
        </SettingsProvider>
      </AuthProvider>
    </ErrorBoundary>
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

  // Periodically re-check (e.g., inventory may have changed via other screens)
  useEffect(() => {
    if (!settings?.notificationsEnabled) return;
    if (getPermissionStatus() !== 'granted') return;
    const id = setInterval(() => {
      const alertWindowDays = settings.alertWindowDays ?? 3;
      getAllBatches()
        .then((batches) => notifyExpiringItems(batches, alertWindowDays))
        .catch(() => {});
    }, 60 * 60 * 1000); // every hour
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
