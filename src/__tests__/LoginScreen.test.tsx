import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { LoginScreen } from '@/screens/LoginScreen';
import { AuthProvider } from '@/context/AuthContext';

const MASTER_PASSWORD = 'test-master-123';

function renderLoginScreen(onLogin?: () => void) {
  return render(
    <AuthProvider>
      <LoginScreen onLogin={onLogin ?? vi.fn()} />
    </AuthProvider>
  );
}

describe('LoginScreen', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.stubEnv('VITE_MASTER_PASSWORD', MASTER_PASSWORD);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    localStorage.clear();
  });

  it('should render a password input', () => {
    renderLoginScreen();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
  });

  it('should render an Unlock button', () => {
    renderLoginScreen();
    expect(screen.getByRole('button', { name: /unlock/i })).toBeInTheDocument();
  });

  it('should not show error initially', () => {
    renderLoginScreen();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('should show error on wrong password', () => {
    renderLoginScreen();
    const input = screen.getByLabelText(/password/i);
    const button = screen.getByRole('button', { name: /unlock/i });

    fireEvent.change(input, { target: { value: 'wrong-password' } });
    fireEvent.click(button);

    expect(screen.getByRole('alert')).toHaveTextContent(/incorrect|invalid|wrong/i);
  });

  it('should call onLogin when correct password is entered', () => {
    const onLogin = vi.fn();
    renderLoginScreen(onLogin);

    const input = screen.getByLabelText(/password/i);
    const button = screen.getByRole('button', { name: /unlock/i });

    fireEvent.change(input, { target: { value: MASTER_PASSWORD } });
    fireEvent.click(button);

    expect(onLogin).toHaveBeenCalledTimes(1);
  });

  it('should not call onLogin when wrong password is entered', () => {
    const onLogin = vi.fn();
    renderLoginScreen(onLogin);

    const input = screen.getByLabelText(/password/i);
    const button = screen.getByRole('button', { name: /unlock/i });

    fireEvent.change(input, { target: { value: 'wrong' } });
    fireEvent.click(button);

    expect(onLogin).not.toHaveBeenCalled();
  });

  it('should clear error when user types after a failed attempt', () => {
    renderLoginScreen();

    const input = screen.getByLabelText(/password/i);
    const button = screen.getByRole('button', { name: /unlock/i });

    // First: wrong password
    fireEvent.change(input, { target: { value: 'wrong' } });
    fireEvent.click(button);
    expect(screen.getByRole('alert')).toBeInTheDocument();

    // Type again — error should clear
    fireEvent.change(input, { target: { value: 'a' } });
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
