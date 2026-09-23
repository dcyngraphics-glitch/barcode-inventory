import { useAuth } from '@/context/AuthContext';
import { ShieldX, LogOut } from 'lucide-react';

export function AccessDeniedScreen() {
  const { user, logout } = useAuth();

  return (
    <div className="screen-center">
      <div className="status-card">
        <div className="status-icon denied">
          <ShieldX size={48} strokeWidth={1.5} />
        </div>
        <h1>Access Denied</h1>
        <p className="status-message">
          Your account ({user?.email}) has been locked by an administrator.
        </p>
        <p className="status-hint">
          Please contact support if you believe this is an error.
        </p>
        <button onClick={logout} className="btn-secondary">
          <LogOut size={18} />
          Sign Out
        </button>
      </div>
    </div>
  );
}
