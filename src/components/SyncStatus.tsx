
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
    // Check Dexie Cloud sync status if available
    const syncUrl = (import.meta.env.VITE_DEXIE_CLOUD_SYNC_URL as string) || '';
    if (!syncUrl) return;
    const interval = setInterval(() => {
      const cloud = (db as any).cloud;
      if (cloud && cloud.currentUser) {
        setSyncing(true);
        setTimeout(() => setSyncing(false), 500);
      } else {
        setSyncing(false);
      }
    }, 5000);
    return () => clearInterval(interval);
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
