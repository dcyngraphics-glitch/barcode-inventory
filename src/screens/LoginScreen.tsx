import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Package, LogIn } from 'lucide-react';

export function LoginScreen() {
  const { login, isLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await login(email, password);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Login failed. Please try again.');
    }
  };

  return (
    <div className="screen-center">
      <div className="login-card">
        <div className="login-logo">
          <Package size={48} strokeWidth={1.5} />
        </div>
        <h1>Barcode Inventory</h1>
        <p className="login-subtitle">Sign in with your dashboard account</p>

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              autoComplete="email"
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Your password"
              required
              autoComplete="current-password"
            />
          </div>

          {error && (
            <div className="login-error" role="alert">
              {error}
            </div>
          )}

          <button type="submit" className="btn-primary" disabled={isLoading}>
            <LogIn size={18} />
            {isLoading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <p className="login-hint">
          First-time users are auto-registered on sign-in.
        </p>
      </div>
    </div>
  );
}
