import { useState } from 'react';
import { Cloud, CloudOff, Loader2, LogOut } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export function SyncSettings() {
  const { cloudUser, cloudSyncing, cloudLogin, cloudLogout } = useAuth();
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState<'email' | 'otp'>('email');

  const handleSendOtp = async () => {
    if (!email.trim()) return;
    setError('');
    setLoading(true);
    try {
      await cloudLogin(email.trim());
      setStep('otp');
    } catch (err: any) {
      setError(err?.message ?? 'Failed to send login code. Check your email.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otp.trim()) return;
    setError('');
    setLoading(true);
    try {
      await cloudLogin(email.trim(), otp.trim());
      setStep('email');
      setEmail('');
      setOtp('');
    } catch (err: any) {
      setError(err?.message ?? 'Invalid code. Try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    setLoading(true);
    try {
      await cloudLogout();
    } catch (err: any) {
      setError(err?.message ?? 'Logout failed');
    } finally {
      setLoading(false);
    }
  };

  if (cloudUser) {
    return (
      <>
        <div className="settings-row">
          <Cloud size={20} className="text-green-500" aria-hidden="true" />
          <div className="flex-1">
            <div className="settings-info-name">{cloudUser}</div>
            <div className="settings-info-version">
              {cloudSyncing ? 'Syncing...' : 'Connected'}
            </div>
          </div>
        </div>
        <button
          onClick={handleLogout}
          disabled={loading}
          className="settings-row settings-row-danger"
        >
          <LogOut size={20} aria-hidden="true" />
          {loading ? 'Disconnecting...' : 'Disconnect Sync'}
        </button>
      </>
    );
  }

  return (
    <>
      {step === 'email' ? (
        <>
          <div className="settings-row">
            <CloudOff size={20} className="text-muted" aria-hidden="true" />
            <div className="flex-1">
              <div className="settings-info-name">Not connected</div>
              <div className="settings-info-version">
                Log in with your email to sync across devices
              </div>
            </div>
          </div>
          <div className="settings-row">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              className="settings-input"
              aria-label="Email for sync login"
            />
          </div>
          <button
            onClick={handleSendOtp}
            disabled={loading || !email.trim()}
            className="settings-row"
          >
            {loading ? (
              <Loader2 size={20} className="animate-spin" aria-hidden="true" />
            ) : (
              <Cloud size={20} aria-hidden="true" />
            )}
            {loading ? 'Sending code...' : 'Send Login Code'}
          </button>
        </>
      ) : (
        <>
          <div className="settings-row">
            <Cloud size={20} className="text-blue-500" aria-hidden="true" />
            <div className="flex-1">
              <div className="settings-info-name">Enter the code sent to {email}</div>
              <div className="settings-info-version">
                Check your email for a one-time login code
              </div>
            </div>
          </div>
          <div className="settings-row">
            <input
              type="text"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              placeholder="Enter 6-digit code"
              className="settings-input"
              aria-label="One-time login code"
              autoFocus
            />
          </div>
          <button
            onClick={handleVerifyOtp}
            disabled={loading || !otp.trim()}
            className="settings-row"
          >
            {loading ? (
              <Loader2 size={20} className="animate-spin" aria-hidden="true" />
            ) : (
              <Cloud size={20} aria-hidden="true" />
            )}
            {loading ? 'Verifying...' : 'Verify & Connect'}
          </button>
          <button
            onClick={() => { setStep('email'); setOtp(''); setError(''); }}
            className="settings-row"
          >
            ← Back
          </button>
        </>
      )}
      {error && (
        <div className="settings-warning" role="alert">
          {error}
        </div>
      )}
    </>
  );
}
