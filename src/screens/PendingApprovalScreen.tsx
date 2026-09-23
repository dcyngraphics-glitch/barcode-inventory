import { useAuth } from '@/context/AuthContext';
import { Clock, LogOut } from 'lucide-react';

export function PendingApprovalScreen() {
  const { user, logout } = useAuth();

  return (
    <div className="screen-center">
      <div className="status-card">
        <div className="status-icon pending">
          <Clock size={48} strokeWidth={1.5} />
        </div>
        <h1>Pending Approval</h1>
        <p className="status-message">
          Your account ({user?.email}) has been created but is awaiting admin approval.
        </p>
        <p className="status-hint">
          You'll be able to access the app once an administrator approves your account.
          Please check back later.
        </p>
        <button onClick={logout} className="btn-secondary">
          <LogOut size={18} />
          Sign Out
        </button>
      </div>
    </div>
  );
}
