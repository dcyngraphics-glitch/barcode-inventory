import { Routes, Route, useLocation, Link } from 'react-router-dom';
import { ScanLine, Package, Settings } from 'lucide-react';
import { ScannerScreen } from '@/screens/ScannerScreen';
import { InventoryScreen } from '@/screens/InventoryScreen';
import { SettingsScreen } from '@/screens/SettingsScreen';
import { ProductDetailScreen } from '@/screens/ProductDetailScreen';
import { useTheme } from '@/hooks/useTheme';

const navItems = [
  { path: '/', icon: ScanLine, label: 'Scan' },
  { path: '/inventory', icon: Package, label: 'Inventory' },
  { path: '/settings', icon: Settings, label: 'Settings' },
];

function BottomNav() {
  const location = useLocation();

  return (
    <nav className="bottom-nav">
      {navItems.map((item) => {
        const isActive = item.path === '/'
          ? location.pathname === '/' || location.pathname.startsWith('/product')
          : location.pathname.startsWith(item.path);
        return (
          <Link
            key={item.path}
            to={item.path}
            className={`bottom-nav-item${isActive ? ' active' : ''}`}
          >
            <item.icon size={24} />
            <span className="bottom-nav-label">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

export default function App() {
  useTheme();
  return (
    <div className="app-container">
      <Routes>
        <Route path="/" element={<ScannerScreen />} />
        <Route path="/product/:barcode" element={<ProductDetailScreen />} />
        <Route path="/inventory" element={<InventoryScreen />} />
        <Route path="/settings" element={<SettingsScreen />} />
      </Routes>
      <BottomNav />
    </div>
  );
}