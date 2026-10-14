import { useState, type FormEvent } from 'react';
import { Lock } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

interface LoginScreenProps {
  onLogin: () => void;
}

export function LoginScreen({ onLogin }: LoginScreenProps) {
  const { login } = useAuth();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (login(password)) {
      onLogin();
    } else {
      setError('Incorrect password. Please try again.');
    }
  };

  return (
    <div className="screen-center">
      <div className="login-card">
        <div className="login-logo">
          <Lock size={40} />
        </div>
        <h1>Inventory</h1>
        <p className="login-subtitle">Enter your password to continue</p>

        <form className="login-form" onSubmit={handleSubmit}>
          <label htmlFor="login-password">Password</label>
          <input
            id="login-password"
            type="password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              if (error) setError('');
            }}
            autoComplete="current-password"
            autoFocus
          />

          {error && (
            <div role="alert" className="login-error">
              {error}
            </div>
          )}

          <button type="submit">Unlock</button>
        </form>

        <p className="login-hint">Enter your master password to access inventory.</p>
      </div>
    </div>
  );
}
