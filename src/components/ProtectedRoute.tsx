import { useAuth } from '@/context/AuthContext';
import { LoginScreen } from '@/screens/LoginScreen';
import { PendingApprovalScreen } from '@/screens/PendingApprovalScreen';
import { AccessDeniedScreen } from '@/screens/AccessDeniedScreen';
import type { ReactNode } from 'react';

interface ProtectedRouteProps {
  children: ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { status } = useAuth();

  switch (status) {
    case 'loading':
      return (
        <div className="screen-center">
          <div className="loading-spinner" role="status" aria-label="Loading">
            <div className="spinner" />
            <p>Checking authentication...</p>
          </div>
        </div>
      );
    case 'unauthenticated':
      return <LoginScreen />;
    case 'pending':
      return <PendingApprovalScreen />;
    case 'locked':
      return <AccessDeniedScreen />;
    case 'active':
      return <>{children}</>;
    default:
      return <LoginScreen />;
  }
}
