import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ScanLine, Keyboard, WifiOff, ShoppingCart } from 'lucide-react';
import { CameraViewfinder } from '@/components/CameraViewfinder';
import { ManualEntrySheet } from '@/components/ManualEntrySheet';
import { QuickEntryModal } from '@/components/QuickEntryModal';
import { RecentScans } from '@/components/RecentScans';
import { ScreenTooltip } from '@/components/ScreenTooltip';
import { useScanCart } from '@/context/ScanCartContext';
import { useSettings } from '@/hooks/useSettings';
import { lookupProduct } from '@/services/productLookupService';
import type { Product } from '@/types';

// Beep audio using Web Audio API oscillator
function playBeep() {
  try {
    const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(880, ctx.currentTime);
    gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.1);
    // Clean up after the tone ends
    setTimeout(() => ctx.close(), 200);
  } catch {
    // Silently ignore if Web Audio API is not available
  }
}

export function ScannerScreen() {
  const navigate = useNavigate();
  const { addItem, totalItems, totalPrice } = useScanCart();
  const { settings } = useSettings();
  const [manualEntryOpen, setManualEntryOpen] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [quickEntryBarcode, setQuickEntryBarcode] = useState<string | null>(null);
  const [scanToast, setScanToast] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cashierMode = settings?.cashierMode ?? false;

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

  // Cleanup toast timer on unmount
  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, []);

  const showScanToast = useCallback((message: string) => {
    setScanToast(message);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setScanToast(null), 3000);
  }, []);

  const handleBarcodeSubmit = useCallback(async (barcode: string) => {
    if (scanning) return; // prevent concurrent scans
    setScanning(true);

    // Haptic feedback if available
    if (navigator.vibrate) {
      navigator.vibrate(50);
    }

    // Beep on successful scan
    playBeep();

    // Spec flow (default): navigate to Product Detail
    if (!cashierMode) {
      navigate(`/product/${encodeURIComponent(barcode)}`);
      setScanning(false);
      return;
    }

    // Cashier Mode (opt-in): add to cart and keep scanning
    try {
      const result = await lookupProduct(barcode);

      if (result.source === 'manual') {
        // Unknown product — prompt for price and expiry
        setQuickEntryBarcode(barcode);
        setScanning(false);
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
  }, [addItem, showScanToast, scanning, cashierMode, navigate]);

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
            background: 'var(--color-background)',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
        {/* Visually hidden live region for screen readers */}
                <div style={{position: 'absolute', width: '1px', height: '1px', padding: 0, margin: 'calc(-1 * var(--space-xs))', overflow: 'hidden', clip: 'rect(0, 0, 0, 0)', whiteSpace: 'nowrap', border: 0}} aria-live="polite">
                          {totalItems} items, ₱{totalPrice.toFixed(2)}
                        </div>
      {/* Top App Bar */}
      <header
        style={{
          height: 'var(--appbar-height)',
          background: 'var(--color-primary)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 var(--space-md)',
          position: 'sticky',
          top: 0,
          zIndex: 30,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
          <ScanLine size={24} color="#f8fafc" />
          <h1
            style={{
              fontSize: 'var(--text-lg)',
              fontWeight: 600,
              color: 'var(--color-on-primary)',
              margin: 0,
            }}
          >
            Scan Product
          </h1>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
          {/* Offline indicator */}
          {!isOnline && (
            <div
                          role="status"
                          aria-live="polite"
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 'var(--space-xs)',
                            color: 'var(--color-muted-foreground)',
                            fontSize: 'var(--text-xs)',
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
              gap: 'var(--space-xs)',
              background: totalItems > 0 ? '#0f172a' : 'transparent',
              border: totalItems > 0 ? '1.5px solid #3b82f6' : '1.5px solid transparent',
              borderRadius: 'var(--radius-md)',
              padding: 'var(--space-xs) var(--space-sm)',
              cursor: 'pointer',
              color: 'var(--color-on-primary)',
              fontSize: 'var(--text-xs)',
              fontWeight: 600,
              transition: 'var(--transition-base)',
              position: 'relative',
            }}
            aria-label={`Cart with ${totalItems} items`}
          >
            <ShoppingCart size={18} />
            {totalItems > 0 && (
              <>
                <span>{totalItems}</span>
                <span style={{ opacity: 0.7, fontSize: 'var(--text-xs)' }}>
                  ₱{totalPrice.toFixed(2)}
                </span>
              </>
            )}
          </button>
        </div>
      {/* Visually hidden live region for screen readers */}
                <div
                  style={{
                    position: 'absolute',
                    width: 1,
                    height: 1,
                    padding: 0,
                    margin: -1,
                    overflow: 'hidden',
                    clip: 'rect(0, 0, 0, 0)',
                    border: 0
                  }}
                  aria-live="polite"
                >
                  {`Cart: ${totalItems} items, ₱${totalPrice.toFixed(2)}`}
                </div>
        </header>

      {/* Main content */}
      <main
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          padding: 'var(--space-md)',
          gap: 'var(--space-md)',
        }}
      >
        {/* Camera Viewfinder */}
        <CameraViewfinder onScan={handleBarcodeSubmit} onManualEntry={() => setManualEntryOpen(true)} />

        {/* Manual Entry Button */}
        <button
          onClick={() => setManualEntryOpen(true)}
          style={{
            width: '100%',
            background: 'transparent',
            color: 'var(--color-on-primary)',
            border: '2px solid #334155',
            padding: 'var(--space-md) var(--space-lg)',
            borderRadius: 'var(--radius-md)',
            fontWeight: 600,
            fontSize: 'var(--text-base)',
            minHeight: '44px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 'var(--space-sm)',
            transition: 'var(--transition-base)',
          }}
        >
          <Keyboard size={20} />
          Enter barcode manually
        </button>

        {/* Recent Scans */}
        <RecentScans />
      </main>

            {/* Live region for screen readers */}
            <div
              style={{ position: 'absolute', width: 1, height: 1, padding: 0, margin: -1, overflow: 'hidden', clip: 'rect(0, 0, 0, 0)', whiteSpace: 'nowrap', border: 0 }}
              aria-live="polite"
            >
              Cart has {totalItems} items, total price ₱{totalPrice.toFixed(2)}
            </div>

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
            background: 'var(--color-background)',
            color: '#fff',
            padding: 'var(--space-xs) var(--space-md)',
            borderRadius: 'var(--radius-md)',
            fontSize: 'var(--text-sm)',
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

      <ScreenTooltip
        screenId="scanner"
        message="Tap the barcode or use the keyboard icon for manual entry"
      />
    </div>
  );
}
