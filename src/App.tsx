import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { NavBar } from '@/components/Layout';
import { Placeholder } from '@/components/Layout';

function ScannerScreen() {
  return Placeholder({ label: 'Scanner — coming soon' });
}

function InventoryScreen() {
  return Placeholder({ label: 'Inventory — coming soon' });
}

function ProductsScreen() {
  return Placeholder({ label: 'Product Management — coming soon' });
}

function SettingsScreen() {
  return Placeholder({ label: 'Settings — coming soon' });
}

export default function App() {
  return (
    <BrowserRouter>
      <div style={{ maxWidth: '480px', margin: '0 auto', minHeight: '100vh', background: '#0f172a' }}>
        <header style={{ padding: '1rem', textAlign: 'center', color: '#f8fafc', fontSize: '1.25rem', fontWeight: 'bold' }}>
          Barcode Inventory
        </header>
        <main style={{ paddingBottom: '4rem' }}>
          <Routes>
            <Route path="/" element={<ScannerScreen />} />
            <Route path="/inventory" element={<InventoryScreen />} />
            <Route path="/products" element={<ProductsScreen />} />
            <Route path="/settings" element={<SettingsScreen />} />
          </Routes>
        </main>
        <NavBar />
      </div>
    </BrowserRouter>
  );
}