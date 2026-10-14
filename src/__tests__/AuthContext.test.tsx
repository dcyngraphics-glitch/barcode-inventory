import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, act } from '@testing-library/react';
import { useState } from 'react';
import { AuthProvider, useAuth } from '../context/AuthContext';

const AUTH_KEY = 'barcode_inventory_auth';
const MASTER_PASSWORD = 'test-master-123';

function TestConsumer() {
  const { isAuthenticated, login, logout, getMasterPassword, setMasterPassword } = useAuth();
  const [loginResult, setLoginResult] = useState<string>('none');
  return (
    <div>
      <div data-testid="auth">{String(isAuthenticated)}</div>
      <div data-testid="master-pw">{getMasterPassword()}</div>
      <div data-testid="login-result">{loginResult}</div>
      <button onClick={() => setLoginResult(String(login(MASTER_PASSWORD)))}>Login Correct</button>
      <button onClick={() => setLoginResult(String(login('wrong')))}>Login Wrong</button>
      <button onClick={logout}>Logout</button>
      <button onClick={() => setMasterPassword('override-pw')}>Set Override</button>
      <button onClick={() => setLoginResult(String(login('override-pw')))}>Login Persisted</button>
    </div>
  );
}

function renderAuth() {
  return render(
    <AuthProvider>
      <TestConsumer />
    </AuthProvider>
  );
}

describe('AuthContext', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.stubEnv('VITE_MASTER_PASSWORD', MASTER_PASSWORD);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    localStorage.clear();
  });

  it('should start unauthenticated when localStorage is empty', () => {
    const { getByTestId } = renderAuth();
    expect(getByTestId('auth')).toHaveTextContent('false');
  });

  it('should start authenticated when localStorage has auth key', () => {
    localStorage.setItem(AUTH_KEY, 'true');
    const { getByTestId } = renderAuth();
    expect(getByTestId('auth')).toHaveTextContent('true');
  });

  it('should return true and set authenticated on correct password', () => {
    const { getByTestId, getByText } = renderAuth();
    act(() => {
      getByText('Login Correct').click();
    });
    expect(getByTestId('auth')).toHaveTextContent('true');
    expect(localStorage.getItem(AUTH_KEY)).toBe('true');
  });

  it('should return false and stay unauthenticated on wrong password', () => {
    const { getByTestId, getByText } = renderAuth();
    act(() => {
      getByText('Login Wrong').click();
    });
    expect(getByTestId('auth')).toHaveTextContent('false');
    expect(localStorage.getItem(AUTH_KEY)).toBeNull();
  });

  it('should clear auth state on logout', () => {
    localStorage.setItem(AUTH_KEY, 'true');
    const { getByTestId, getByText } = renderAuth();
    expect(getByTestId('auth')).toHaveTextContent('true');
    act(() => {
      getByText('Logout').click();
    });
    expect(getByTestId('auth')).toHaveTextContent('false');
    expect(localStorage.getItem(AUTH_KEY)).toBeNull();
  });

  it('should return the master password from env', () => {
    const { getByTestId } = renderAuth();
    expect(getByTestId('master-pw')).toHaveTextContent(MASTER_PASSWORD);
  });

  it('should allow overriding the master password', () => {
    const { getByTestId, getByText } = renderAuth();
    act(() => {
      getByText('Set Override').click();
    });
    expect(getByTestId('master-pw')).toHaveTextContent('override-pw');
  });

  it('should return false for login with original password after override', () => {
    const { getByTestId, getByText } = renderAuth();
    act(() => {
      getByText('Set Override').click();
    });
    act(() => {
      getByText('Logout').click();
    });
    act(() => {
      getByText('Login Correct').click();
    });
    expect(getByTestId('auth')).toHaveTextContent('false');
    expect(getByTestId('login-result')).toHaveTextContent('false');
  });

  it('should persist master password override to localStorage', () => {
    const { getByTestId, getByText } = renderAuth();
    act(() => {
      getByText('Set Override').click();
    });
    expect(localStorage.getItem('barcode_inventory_master_password')).toBe('override-pw');
    expect(getByTestId('master-pw')).toHaveTextContent('override-pw');
  });

  it('should read master password from localStorage on mount', () => {
    localStorage.setItem('barcode_inventory_master_password', 'persisted-pw');
    const { getByTestId } = renderAuth();
    expect(getByTestId('master-pw')).toHaveTextContent('persisted-pw');
  });

  it('should login with persisted password after remount', () => {
    const first = renderAuth();
    act(() => {
      first.getByText('Set Override').click();
    });
    first.unmount();

    const second = renderAuth();
    act(() => {
      second.getByText('Login Persisted').click();
    });
    expect(second.getByTestId('auth')).toHaveTextContent('true');
    expect(second.getByTestId('login-result')).toHaveTextContent('true');
  });

  it('should throw when useAuth is used outside AuthProvider', () => {
    function Orphan() {
      useAuth();
      return null;
    }
    expect(() => render(<Orphan />)).toThrow('useAuth must be used within AuthProvider');
  });

  it('should return empty string for getMasterPassword when nothing is set', () => {
    vi.stubEnv('VITE_MASTER_PASSWORD', '');
    const { getByTestId } = renderAuth();
    expect(getByTestId('master-pw')).toHaveTextContent('');
  });
});
