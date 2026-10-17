import { Mail } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

/**
 * The signed-out screen. It does not collect the email or the code itself: Dexie Cloud
 * runs that whole conversation and asks for each value through
 * db.cloud.userInteraction, which UserInteractionPrompt renders on top of this card.
 *
 * So this is only the entry point — one button, and whatever went wrong last time.
 */
export function LoginScreen() {
  const { cloudLogin, cloudError } = useAuth();

  return (
    <div className="screen-center">
      <div className="login-card">
        <div className="login-logo">
          <Mail size={40} />
        </div>

        <h1>Inventory</h1>
        <p className="login-subtitle">
          Sign in to keep your inventory in sync across your phones
        </p>

        <div className="login-form">
          <button type="button" className="login-submit" onClick={cloudLogin}>
            Sign in with email
          </button>
        </div>

        {cloudError && (
          <div className="login-error" role="alert">
            {cloudError}
          </div>
        )}

        <p className="login-hint">
          We&apos;ll email you a one-time code — no password to remember. Your account is
          created the first time you sign in.
        </p>
      </div>
    </div>
  );
}
