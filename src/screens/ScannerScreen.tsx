import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ScanLine, Keyboard, WifiOff } from 'lucide-react';
import { CameraViewfinder } from '@/components/CameraViewfinder';
import { ManualEntrySheet } from '@/components/ManualEntrySheet';
import { RecentScans } from '@/components/RecentScans';

export function ScannerScreen() {
  const navigate = useNavigate();
  const [manualEntryOpen, setManualEntryOpen] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

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

  const handleBarcodeSubmit = (barcode: string) => {
    // Haptic feedback if available
    if (navigator.vibrate) {
      navigator.vibrate(50);
    }
    navigate(`/product/${barcode}`);
  };

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
    </div>
  );
}
