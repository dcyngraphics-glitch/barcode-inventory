import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { LoginScreen } from '@/screens/LoginScreen';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import db from '@/db/dexie';

function renderLogin() {
  return render(
    <AuthProvider>
      <LoginScreen />
    </AuthProvider>
  );
}

describe('Sign-in Gate - First Run', () => {
  beforeEach(() => {
    delete (db as any).cloud;
  });

  afterEach(() => {
    delete (db as any).cloud;
  });

  it('renders a single "Sign in with email" button', () => {
    renderLogin();
    const buttons = screen.getAllByRole('button');
    // The gate's real contract is a single CTA. The "Continue as guest" button only
    // renders when VITE_BYPASS_LOGIN is on (UI-testing bypass), so in the default
    // environment there is exactly one button.
    expect(buttons).toHaveLength(1);
    expect(buttons[0]).toHaveTextContent(/sign in with email/i);
    // The CTA is a plain onClick button (the form lives inside Dexie's OTP dialog),
    // so it is type="button", not a form submit.
    expect(buttons[0]).toHaveAttribute('type', 'button');
  });

  it('shows no error initially', () => {
    renderLogin();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('displays a hint about email OTP', () => {
    renderLogin();
    expect(screen.getByText(/email you a one-time code/i)).toBeInTheDocument();
  });

  it('shows "unavailable" error when cloud addon is null', () => {
    renderLogin();
    act(() => {
      screen.getByRole('button', { name: /sign in with email/i }).click();
    });
    expect(screen.getByRole('alert')).toHaveTextContent(/unavailable/i);
  });

  it('shows "not configured" error when cloud.options is null', () => {
    (db as any).cloud = { options: null, login: vi.fn() };
    renderLogin();
    act(() => {
      screen.getByRole('button', { name: /sign in with email/i }).click();
    });
    expect(screen.getByRole('alert')).toHaveTextContent(/not configured/i);
  });

  it('calls cloud.login with OTP grant type when button clicked', () => {
    const login = vi.fn().mockResolvedValue(undefined);
    (db as any).cloud = { options: {}, login };
    renderLogin();
    act(() => {
      screen.getByRole('button', { name: /sign in with email/i }).click();
    });
    expect(login).toHaveBeenCalledWith({ grant_type: 'otp' });
  });

  it('handles rapid repeated clicks without crashing', () => {
    const login = vi.fn().mockResolvedValue(undefined);
    (db as any).cloud = { options: {}, login };
    renderLogin();

    const button = screen.getByRole('button', { name: /sign in with email/i });
    for (let i = 0; i < 5; i++) {
      act(() => {
        button.click();
      });
    }
    expect(login).toHaveBeenCalledTimes(5);
  });
});