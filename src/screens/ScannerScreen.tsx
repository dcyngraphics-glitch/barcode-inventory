import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ScanLine, Keyboard, WifiOff, ShoppingCart } from 'lucide-react';
import { CameraViewfinder } from '@/components/CameraViewfinder';
import { ManualEntrySheet } from '@/components/ManualEntrySheet';
import { QuickEntryModal } from '@/components/QuickEntryModal';
import { RecentScans } from '@/components/RecentScans';
import { useScanCart } from '@/context/ScanCartContext';
import { lookupProduct } from '@/services/productLookupService';
import type { Product } from '@/types';

export function ScannerScreen() {
  const navigate = useNavigate();
  const { addItem, totalItems, totalPrice } = useScanCart();
  const [manualEntryOpen, setManualEntryOpen] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [quickEntryBarcode, setQuickEntryBarcode] = useState<string | null>(null);
  const [scanToast, setScanToast] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);

  // Listen for online/offline events
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const showScanToast = useCallback((message: string) => {
    setScanToast(message);
    setTimeout(() => setScanToast(null), 1500);
  }, []);

  const handleBarcodeSubmit = useCallback(async (barcode: string) => {
    if (scanning) return; // prevent concurrent scans
    setScanning(true);

    // Haptic feedback if available
    if (navigator.vibrate) {
      navigator.vibrate(50);
    }

    try {
      const result = await lookupProduct(barcode);

      if (result.source === 'manual') {
        // Unknown product — prompt for price and expiry
        setQuickEntryBarcode(barcode);
        return;
      }

      const product: Product = result.product;

      addItem({
        barcode,
        product,
        name: product.name,
        brand: product.brand,
        price: product.storePrice,
        expiryDate: product.defaultExpiry,
        quantity: 1,
        needsInfo: false,
        imageUrl: product.imageUrl,
        source: result.source,
      });

      showScanToast(`✓ ${product.name || barcode}`);
    } catch (err) {
      // On lookup error, still add to cart with needsInfo
      const message = err instanceof Error ? err.message : 'Lookup failed';
      console.warn('Lookup failed:', message);
      setQuickEntryBarcode(barcode);
    } finally {
      setScanning(false);
    }
  }, [addItem, showScanToast, scanning]);

  const handleQuickEntrySave = useCallback((price: number, expiryDate: string) => {
    if (!quickEntryBarcode) return;

    addItem({
      barcode: quickEntryBarcode,
      product: null,
      name: '',
      brand: '',
      price,
      expiryDate,
      quantity: 1,
      needsInfo: false,
      source: 'manual',
    });

    setQuickEntryBarcode(null);
    showScanToast('✓ Added to cart');
  }, [quickEntryBarcode, addItem, showScanToast]);

  const handleQuickEntryCancel = useCallback(() => {
    setQuickEntryBarcode(null);
  }, []);

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#0f172a',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Top App Bar */}
      <header
        style={{
          height: '56px',
          background: '#334155',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 16px',
          position: 'sticky',
          top: 0,
          zIndex: 30,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <ScanLine size={24} color="#f8fafc" />
          <h1
            style={{
              fontSize: '18px',
              fontWeight: 600,
              color: '#f8fafc',
              margin: 0,
            }}
          >
            Scan Product
          </h1>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* Offline indicator */}
          {!isOnline && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                color: '#94a3b8',
                fontSize: '12px',
              }}
              title="You are offline"
            >
              <WifiOff size={16} />
              <span>Offline</span>
            </div>
          )}

          {/* Cart Badge */}
          <button
            onClick={() => navigate('/cart')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: totalItems > 0 ? '#0f172a' : 'transparent',
              border: totalItems > 0 ? '1.5px solid #3b82f6' : '1.5px solid transparent',
              borderRadius: '8px',
              padding: '6px 12px',
              cursor: 'pointer',
              color: '#f8fafc',
              fontSize: '13px',
              fontWeight: 600,
              transition: 'all 200ms ease',
              position: 'relative',
            }}
            aria-label={`Cart with ${totalItems} items`}
          >
            <ShoppingCart size={18} />
            {totalItems > 0 && (
              <>
                <span>{totalItems}</span>
                <span style={{ opacity: 0.7, fontSize: '12px' }}>
                  ₱{totalPrice.toFixed(2)}
                </span>
              </>
            )}
          </button>
        </div>
      </header>

      {/* Main content */}
      <main
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          padding: '16px',
          gap: '16px',
        }}
      >
        {/* Camera Viewfinder */}
        <CameraViewfinder onScan={handleBarcodeSubmit} />

        {/* Manual Entry Button */}
        <button
          onClick={() => setManualEntryOpen(true)}
          style={{
            width: '100%',
            background: 'transparent',
            color: '#f8fafc',
            border: '2px solid #334155',
            padding: '12px 24px',
            borderRadius: '8px',
            fontWeight: 600,
            fontSize: '16px',
            minHeight: '44px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            transition: 'all 200ms ease',
          }}
        >
          <Keyboard size={20} />
          Enter barcode manually
        </button>

        {/* Recent Scans */}
        <RecentScans />
      </main>

      {/* Manual Entry Bottom Sheet */}
      <ManualEntrySheet
        open={manualEntryOpen}
        onClose={() => setManualEntryOpen(false)}
        onSubmit={handleBarcodeSubmit}
      />

      {/* Quick Entry Modal for unknown products */}
      {quickEntryBarcode && (
        <QuickEntryModal
          barcode={quickEntryBarcode}
          onSave={handleQuickEntrySave}
          onCancel={handleQuickEntryCancel}
        />
      )}

      {/* Scan Toast */}
      {scanToast && (
        <div
          style={{
            position: 'fixed',
            bottom: '72px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: '#0f172a',
            color: '#fff',
            padding: '10px 20px',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: 500,
            zIndex: 60,
            animation: 'fade-in 200ms ease',
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
          }}
          role="status"
          aria-live="polite"
        >
          {scanToast}
        </div>
      )}

      <style>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateX(-50%) translateY(10px); }
          to { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
      `}</style>
    </div>
  );
}
