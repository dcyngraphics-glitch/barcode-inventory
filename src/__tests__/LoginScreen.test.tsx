import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { LoginScreen } from '@/screens/LoginScreen';
import { AuthProvider } from '@/context/AuthContext';
import db from '@/db/dexie';

function renderLogin() {
  return render(
    <AuthProvider>
      <LoginScreen />
    </AuthProvider>,
  );
}

describe('LoginScreen', () => {
  beforeEach(() => {
    delete (db as any).cloud;
  });

  afterEach(() => {
    delete (db as any).cloud;
  });

  it('offers a single sign-in action', () => {
    renderLogin();
    expect(screen.getByRole('button', { name: /sign in with email/i })).toBeInTheDocument();
  });

  it('styles the action as the primary button', () => {
    renderLogin();
    expect(screen.getByRole('button', { name: /sign in with email/i })).toHaveClass('login-submit');
  });

  it('no longer collects a password — the account login replaced it', () => {
    renderLogin();
    expect(screen.queryByLabelText(/password/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /unlock/i })).not.toBeInTheDocument();
  });

  it('starts the Dexie Cloud OTP flow when tapped', () => {
    const login = vi.fn().mockResolvedValue(undefined);
    (db as any).cloud = { options: {}, login };

    renderLogin();
    act(() => {
      fireEvent.click(screen.getByRole('button', { name: /sign in with email/i }));
    });

    expect(login).toHaveBeenCalledWith({ grant_type: 'otp' });
  });

  it('shows no error initially', () => {
    renderLogin();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('explains that the account is created on first sign-in', () => {
    renderLogin();
    expect(screen.getByText(/created the first time/i)).toBeInTheDocument();
  });
});

describe('LoginScreen — token classes', () => {
  it('screen center uses .screen-center token class, not inline styles', () => {
    renderLogin();
    const center = screen.getByTestId('screen-center');
    expect(center).toHaveClass('screen-center');
    expect(center).not.toHaveStyle({ background: '#F8FAFC' });
    expect(center).not.toHaveStyle({ padding: '24px' });
  });

  it('login card uses .login-card token class, not inline #334155', () => {
    renderLogin();
    const card = screen.getByRole('button', { name: /sign in with email/i }).closest('.login-card');
    expect(card).toHaveClass('login-card');
    expect(card).not.toHaveStyle({ background: '#334155' });
  });

  it('submit button uses .login-submit token class, not inline gradient', () => {
    renderLogin();
    const btn = screen.getByRole('button', { name: /sign in with email/i });
    expect(btn).toHaveClass('login-submit');
    expect(btn).not.toHaveStyle({ background: 'linear-gradient(135deg, #059669 0%, #0d9488 50%, #17a974 100%)' });
    expect(btn).not.toHaveStyle({ color: '#ffffff' });
  });

  it('login-submit uses token colors from CSS variables', () => {
    renderLogin();
    const btn = screen.getByRole('button', { name: /sign in with email/i });
    const style = window.getComputedStyle(btn);
    expect(style.background).not.toContain('#059669');
    expect(style.background).not.toContain('#0d9488');
    expect(style.background).not.toContain('#17a974');
    expect(style.color).not.toBe('rgb(255, 255, 255)');
  });
});
