import { useState, useEffect } from 'react';
import { WifiOff } from 'lucide-react';

/**
 * A thin top-of-screen indicator shown whenever the device is offline.
 *
 * The old `WifiOff` chip lived only on the scanner screen, so the till,
 * inventory, product-detail and settings screens had no way to tell the
 * user that a failed lookup (or no network) was why something wasn't working.
 * This replaces the scattered chip with one global signal, so a failed
 * network call and a go-slow are never mistaken for a bug.
 */
export function OfflineIndicator() {
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (isOnline) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      title="You are offline"
      className="offline-indicator"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        padding: 'var(--space-sm) var(--space-md)',
        background: 'var(--color-surface)',
        color: 'var(--color-on-surface)',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.18)',
      }}
    >
      <WifiOff size={18} />
      <span style={{ fontSize: 'var(--text-sm)' }}>You are offline — using local data.</span>
    </div>
  );
}
