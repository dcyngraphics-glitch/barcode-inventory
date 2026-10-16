
import { useState, useEffect } from 'react';
import { Wifi, WifiOff, RefreshCw } from 'lucide-react';
import { db } from '@/db/dexie';

export function SyncStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [syncing, setSyncing] = useState(false);

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

  useEffect(() => {
    const syncUrl = (import.meta.env.VITE_DEXIE_CLOUD_SYNC_URL as string) || '';
    if (!syncUrl) return;

    // Subscribe to Dexie Cloud sync status events
    const cloud = (db as any).cloud;
    if (!cloud) return;

    // Initial state
    setSyncing(cloud.syncState?.isSyncing ?? false);

    // Subscribe to sync state changes
    const unsubscribe = cloud.$on('syncState', (state: any) => {
      setSyncing(state?.isSyncing ?? false);
    });

    // Also poll for changes that may not fire events (fallback)
    const interval = setInterval(() => {
      const state = cloud.syncState;
      if (state) {
        setSyncing(state.isSyncing);
      }
    }, 1000);

    return () => {
      if (unsubscribe) unsubscribe();
      clearInterval(interval);
    };
  }, []);

  return (
    <div className="sync-indicator flex items-center gap-2 text-xs text-slate-400">
      {isOnline ? (
        <Wifi size={14} className="text-green-500" />
      ) : (
        <WifiOff size={14} className="text-red-400" />
      )}
      <span>{isOnline ? 'Online' : 'Offline'}</span>
      {syncing && <RefreshCw size={12} className="animate-spin text-blue-400" />}
    </div>
  );
}
