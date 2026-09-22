import { Routes, Route } from 'react-router-dom';
import { ScannerScreen } from '@/screens/ScannerScreen';
import { InventoryScreen } from '@/screens/InventoryScreen';
import { SettingsScreen } from '@/screens/SettingsScreen';
import { ProductDetailScreen } from '@/screens/ProductDetailScreen';
import { useTheme } from '@/hooks/useTheme';

export default function App() {
  useTheme();
  return (
    <Routes>
      <Route path="/" element={<ScannerScreen />} />
      <Route path="/product/:barcode" element={<ProductDetailScreen />} />
      <Route path="/inventory" element={<InventoryScreen />} />
      <Route path="/settings" element={<SettingsScreen />} />
    </Routes>
  );
}