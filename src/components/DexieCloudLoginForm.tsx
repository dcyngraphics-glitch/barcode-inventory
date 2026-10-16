
import { useState, type FormEvent } from 'react';
import { Wifi, WifiOff, RefreshCw } from 'lucide-react';
import { db } from '@/db/dexie';

export function DexieCloudLoginForm() {
  const [email, setEmail] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [syncEnabled, setSyncEnabled] = useState(!!(import.meta.env.VITE_DEXIE_CLOUD_SYNC_URL as string || '').trim());

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      // For Dexie Cloud, authentication is done via the cloud addon
      const syncUrl = import.meta.env.VITE_DEXIE_CLOUD_SYNC_URL as string;
      if (!syncUrl || !syncUrl.trim()) {
        setError('Sync is not configured. Please set VITE_DEXIE_CLOUD_SYNC_URL.');
        setLoading(false);
        return;
      }
      // Check if cloud is available
      const cloud = (db as any).cloud;
      if (!cloud) {
        setError('Cloud sync is not available. Check dexie-cloud-addon installation.');
        setLoading(false);
        return;
      }
      // Note: Dexie Cloud uses the configured sync URL; the user logs in through the app
      // with their Dexie Cloud account. For demonstration, we show the sync status.
      setSyncEnabled(true);
      setError('');
    } catch (err) {
      setError('Failed to enable sync. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="sync-login-card">
      <h3>Share Across Devices</h3>
      <p className="sync-subtitle">
        Log in to the same Dexie Cloud account on each device to sync inventory data.
      </p>
      <form onSubmit={handleSubmit} className="sync-form">
        <div>
          <label htmlFor="sync-email">Account Email</label>
          <input
            id="sync-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter your Dexie Cloud account email"
            className="sync-input"
          />
        </div>
        <div>
          <label htmlFor="sync-password">Account Password</label>
          <input
            id="sync-password"
            type="password"
            value={passwordInput}
            onChange={(e) => setPasswordInput(e.target.value)}
            placeholder="Enter your account password"
            className="sync-input"
          />
        </div>
        {error && (
          <div role="alert" className="sync-error">
            {error}
          </div>
        )}
        <button type="submit" disabled={loading} className="sync-submit">
          {loading ? 'Enabling sync...' : 'Enable Multi-Device Sync'}
        </button>
      </form>
      <div className="sync-info">
        <Wifi size={16} aria-hidden="true" />
        <span>Uses the same database name: <code>barcode-inventory</code></span>
      </div>
      <div className="sync-info">
        <RefreshCw size={16} aria-hidden="true" />
        <span>Free tier: 3 users, 100 MB storage, 10 connections</span>
      </div>
    </div>
  );
}
