import { useState } from 'react';
import { Cloud, CloudOff, Loader2, LogOut } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

/**
 * Dexie Cloud owns the login conversation, so this screen does not run its own
 * email -> code -> verify state machine. It hands the email to the addon once, and the
 * addon emails a one-time code and prompts for it itself (db.cloud.userInteraction).
 *
 * An earlier version tried to do it in two calls - login({email}) then
 * login({email, otp}) - which cannot work: Dexie Cloud verifies a code against an
 * `otp_id` returned alongside the emailed code, and the addon does not expose it. The
 * second call therefore requested another code instead of checking the one the user typed.
 */
export function SyncSettings() {
  const { cloudUser, cloudSyncing, cloudLogin, cloudError, cloudLogout } = useAuth();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const handleConnect = () => {
    if (!email.trim()) return;
    setSent(true);
    // Not awaited - the addon keeps the login pending while it prompts for the code.
    cloudLogin(email.trim());
  };

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await cloudLogout();
    } finally {
      setLoggingOut(false);
      setSent(false);
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
          disabled={loggingOut}
          className="settings-row settings-row-danger"
        >
          <LogOut size={20} aria-hidden="true" />
          {loggingOut ? 'Disconnecting...' : 'Disconnect Sync'}
        </button>
      </>
    );
  }

  return (
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
          onChange={(e) => {
            setEmail(e.target.value);
            setSent(false);
          }}
          placeholder="your@email.com"
          className="settings-input"
          aria-label="Email for sync login"
          disabled={sent}
        />
      </div>

      <button
        onClick={handleConnect}
        disabled={!email.trim() || sent}
        className="settings-row"
      >
        <Cloud size={20} aria-hidden="true" />
        {sent ? 'Code sent' : 'Send Login Code'}
      </button>

      {sent && !cloudError && (
        <div className="settings-row" role="status">
          <Loader2 size={20} className="animate-spin" aria-hidden="true" />
          <div className="flex-1">
            <div className="settings-info-name">Enter the code sent to {email}</div>
            <div className="settings-info-version">
              A sign-in prompt will ask for the one-time code. First time here? Your
              account is created automatically.
            </div>
          </div>
        </div>
      )}

      {sent && (
        <button
          onClick={() => {
            setSent(false);
            setEmail('');
          }}
          className="settings-row"
        >
          ← Use a different email
        </button>
      )}

      {cloudError && (
        <div className="settings-warning" role="alert">
          {cloudError}
        </div>
      )}
    </>
  );
}
