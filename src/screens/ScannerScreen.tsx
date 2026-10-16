import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ScanLine, WifiOff, ShoppingCart } from 'lucide-react';
import { CameraViewfinder, type CameraViewfinderHandle } from '@/components/CameraViewfinder';
import { QuickEntryModal, type QuickEntryData } from '@/components/QuickEntryModal';
import { ModeSegmentedControl } from '@/components/ModeSegmentedControl';
import { RecentScans } from '@/components/RecentScans';
import { PermissionPromptModal } from '@/components/PermissionPromptModal';
import { ScreenTooltip } from '@/components/ScreenTooltip';
import { useScanCart } from '@/context/ScanCartContext';
import { useSettings } from '@/hooks/useSettings';
import { lookupProduct } from '@/services/productLookupService';
import type { Product } from '@/types';

// Beep audio using Web Audio API oscillator — reuse a single AudioContext
let sharedAudioCtx: AudioContext | null = null;
function getSharedAudioContext(): AudioContext | null {
  try {
    if (!sharedAudioCtx || sharedAudioCtx.state === 'closed') {
      sharedAudioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    }
    if (sharedAudioCtx.state === 'suspended') {
      sharedAudioCtx.resume().catch(() => {});
    }
    return sharedAudioCtx;
  } catch {
    return null;
  }
}
function playBeep() {
  try {
    const ctx = getSharedAudioContext();
    if (!ctx) return;
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
  } catch {
    // Silently ignore if Web Audio API is not available
  }
}

export function ScannerScreen() {
  const navigate = useNavigate();
  const { addItem, totalItems, totalPrice } = useScanCart();
  const { settings } = useSettings();
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [quickEntryBarcode, setQuickEntryBarcode] = useState<string | null>(null);
    const [scanToast, setScanToast] = useState<string | null>(null);
    const [scanning, setScanning] = useState(false);
    const scanningRef = useRef(false);
    const [processing, setProcessing] = useState(false);
    const [cameraActive, setCameraActive] = useState(false);
    const [hasScannedSuccessfully, setHasScannedSuccessfully] = useState(false);
      const [scanMode, setScanMode] = useState<'auto' | 'manual'>('auto');
        const [manualScanAllowed, setManualScanAllowed] = useState<boolean>(false);
        const [modeAnimationClass, setModeAnimationClass] = useState<string>('');
    const [permissionPromptShown, setPermissionPromptShown] = useState(false);
    const [cameraPermissionGranted, setCameraPermissionGranted] = useState(false);
    const [, setTriggeredByButton] = useState(false);

      const isScanAllowed = scanMode === 'auto' || manualScanAllowed;
    const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const modeAnimationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const viewfinderRef = useRef<CameraViewfinderHandle>(null);

// Load camera permission grant status from localStorage
useEffect(() => {
  const granted = localStorage.getItem('cameraPermissionGranted') === 'true';
  setCameraPermissionGranted(granted);
  // If permission was previously granted, we can set permissionPromptShown to true to skip the prompt
  if (granted) {
    setPermissionPromptShown(true);
  }
}, []);

    // Start scanning on mount and when window gains focus
        useEffect(() => {
          if (cameraPermissionGranted) {
            setCameraActive(true);
          }
          setHasScannedSuccessfully(false);
          const handleFocus = () => {
            if (cameraPermissionGranted) {
              setCameraActive(true);
            }
            setHasScannedSuccessfully(false);
            if (scanMode === 'manual') {
              // In manual mode, allow a scan when focus returns (user can tap scan button)
              setManualScanAllowed(true);
              setTriggeredByButton(true);
            }
          };
          window.addEventListener('focus', handleFocus);
          return () => window.removeEventListener('focus', handleFocus);
        }, [scanMode, cameraPermissionGranted]);

    // Stop scanning after first successful scan
    useEffect(() => {
      if (hasScannedSuccessfully) {
        setCameraActive(false);
      }
    }, [hasScannedSuccessfully]);

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

  // Cleanup mode animation timer on unmount
  useEffect(() => {
    return () => {
      if (modeAnimationTimerRef.current) clearTimeout(modeAnimationTimerRef.current);
    };
  }, []);

  const showScanToast = useCallback((message: string) => {
    setScanToast(message);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setScanToast(null), 3000);
  }, []);

  const handleModeChange = (newMode: 'auto' | 'manual') => {
    setScanMode(newMode);
    if (newMode === 'auto') {
      setManualScanAllowed(true);
      showScanToast('Mode switched to Automatic');
    } else {
      setManualScanAllowed(false);
      setHasScannedSuccessfully(false);
      setCameraActive(true);
      showScanToast('Mode switched to Manual');
    }
    // Trigger animation
    setModeAnimationClass('pulse-animate');
    if (modeAnimationTimerRef.current) {
      clearTimeout(modeAnimationTimerRef.current);
    }
    modeAnimationTimerRef.current = setTimeout(() => {
      setModeAnimationClass('');
    }, 300); // match the animation duration
  };

  // Keep scanningRef in sync with scanning state
  useEffect(() => {
    scanningRef.current = scanning;
  }, [scanning]);

  const handleBarcodeSubmit = useCallback(async (barcode: string) => {
        if (scanningRef.current) return; // prevent concurrent scans
        setScanning(true);

        // If scanning is not allowed (e.g., in manual mode and we haven't pressed the button yet), we exit.
        if (!isScanAllowed) {
          setScanning(false);
          return;
        }

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
        setHasScannedSuccessfully(true);
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
        setHasScannedSuccessfully(true);
      } catch (err) {
        // On lookup error, still add to cart with needsInfo
        const message = err instanceof Error ? err.message : 'Lookup failed';
        console.warn('Lookup failed:', message);
        setQuickEntryBarcode(barcode);
      } finally {
        setScanning(false);
      }
    }, [addItem, showScanToast, cashierMode, navigate, setHasScannedSuccessfully]);

  const handleScanClick = useCallback(async () => {
    if (processing) return;
    setProcessing(true);
    try {
      await viewfinderRef.current?.triggerScan();
    } finally {
      setProcessing(false);
    }
  }, [processing]);

  const handleQuickEntrySave = useCallback((data: QuickEntryData) => {
    if (!quickEntryBarcode) return;

    addItem({
      barcode: quickEntryBarcode,
      product: null,
      name: data.name,
      brand: data.brand,
      price: data.price,
      expiryDate: data.expiryDate,
      quantity: 1,
      needsInfo: false,
      source: 'manual',
    });

    setQuickEntryBarcode(null);
    showScanToast(`✓ ${data.name} added to cart`);
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

                  {/* Scan Mode Toggle */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                    <span
                      style={{
                        fontSize: 'var(--text-xs)',
                        color: 'var(--color-on-primary)',
                        opacity: 0.7,
                        fontWeight: 500,
                        letterSpacing: '0.3px',
                        textTransform: 'uppercase',
                      }}
                    >
                      Mode
                    </span>
                    <ModeSegmentedControl mode={scanMode} onChange={handleModeChange} className={modeAnimationClass} />
                  </div>

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
        <CameraViewfinder
          ref={viewfinderRef}
          onScan={handleBarcodeSubmit}
          cameraActive={cameraActive}
        />

        {/* Recent Scans */}
        <RecentScans />
      </main>

      {/* Floating Scan Button — positioned above bottom nav */}
      <div className="scan-fab-container">
        <button
          className={`scan-fab${processing ? ' scan-fab--processing' : ''}`}
          onClick={handleScanClick}
          disabled={processing}
          aria-label="Scan barcode"
        >
          {processing ? (
            <span className="scan-fab-processing">
              <span className="scan-fab-dot" />
              Processing...
            </span>
          ) : (
            <>
              <ScanLine size={28} />
              <span>Scan Barcode</span>
            </>
          )}
        </button>
      </div>

            {/* Live region for screen readers */}
            <div
              style={{ position: 'absolute', width: 1, height: 1, padding: 0, margin: -1, overflow: 'hidden', clip: 'rect(0, 0, 0, 0)', whiteSpace: 'nowrap', border: 0 }}
              aria-live="polite"
            >
              Cart has {totalItems} items, total price ₱{totalPrice.toFixed(2)}
            </div>

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
      {(!permissionPromptShown && !cameraPermissionGranted) && (
        <PermissionPromptModal
          onConfirm={() => {
            setCameraPermissionGranted(true);
            setPermissionPromptShown(true);
            localStorage.setItem('cameraPermissionGranted', 'true');
            setCameraActive(true);
          }}
          onDeny={() => {
            setCameraPermissionGranted(false);
            setPermissionPromptShown(true);
            localStorage.setItem('cameraPermissionGranted', 'false');
          }}
        />
      )}
    </div>
  );
}
