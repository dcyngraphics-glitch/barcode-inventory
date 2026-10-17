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
