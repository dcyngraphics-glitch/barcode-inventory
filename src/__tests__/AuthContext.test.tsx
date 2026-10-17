import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, act } from '@testing-library/react';
import { AuthProvider, useAuth } from '../context/AuthContext';
import db from '../db/dexie';

function TestConsumer() {
  const { cloudUser, cloudError, cloudLogin, cloudLogout } = useAuth();
  return (
    <div>
      <div data-testid="user">{cloudUser ?? 'none'}</div>
      <div data-testid="error">{cloudError}</div>
      <button onClick={cloudLogin}>Sign in</button>
      <button onClick={() => { void cloudLogout(); }}>Sign out</button>
    </div>
  );
}

function renderAuth() {
  return render(
    <AuthProvider>
      <TestConsumer />
    </AuthProvider>,
  );
}

describe('AuthContext', () => {
  beforeEach(() => {
    delete (db as any).cloud;
  });

  afterEach(() => {
    delete (db as any).cloud;
  });

  it('throws when useAuth is used outside AuthProvider', () => {
    function Orphan() {
      useAuth();
      return null;
    }
    expect(() => render(<Orphan />)).toThrow('useAuth must be used within AuthProvider');
  });

  it('reports a clear error when the cloud addon is unavailable', () => {
    const { getByText, getByTestId } = renderAuth();
    act(() => {
      getByText('Sign in').click();
    });
    expect(getByTestId('error')).toHaveTextContent(/unavailable/i);
  });

  it('reports a clear error when sync was never configured', () => {
    (db as any).cloud = { options: null };
    const { getByText, getByTestId } = renderAuth();
    act(() => {
      getByText('Sign in').click();
    });
    expect(getByTestId('error')).toHaveTextContent(/not configured/i);
  });

  it('starts the OTP flow with exactly one login call, and no intent', () => {
    const login = vi.fn().mockResolvedValue(undefined);
    (db as any).cloud = { options: {}, login };

    const { getByText } = renderAuth();
    act(() => {
      getByText('Sign in').click();
    });

    // `intent: 'login'` would make Dexie Cloud refuse an email that has never
    // registered with USER_NOT_REGISTERED, so a first-ever sign-in could never work.
    // And it must be ONE call: an OTP cannot be verified by a follow-up login().
    expect(login).toHaveBeenCalledTimes(1);
    expect(login).toHaveBeenCalledWith({ grant_type: 'otp' });
  });

  it('surfaces a failed sign-in in plain language', async () => {
    const login = vi.fn().mockRejectedValue(new Error('Something went wrong'));
    (db as any).cloud = { options: {}, login };

    const { getByText, getByTestId } = renderAuth();
    await act(async () => {
      getByText('Sign in').click();
    });

    expect(getByTestId('error')).toHaveTextContent('Something went wrong');
  });

  it('treats a dismissed prompt as a cancel, not an error', async () => {
    const abort = Object.assign(new Error('User cancelled'), { name: 'AbortError' });
    const login = vi.fn().mockRejectedValue(abort);
    (db as any).cloud = { options: {}, login };

    const { getByText, getByTestId } = renderAuth();
    await act(async () => {
      getByText('Sign in').click();
    });

    expect(getByTestId('error')).toHaveTextContent('');
  });

  it('reflects the signed-in user from currentUser', () => {
    let emit: (user: any) => void = () => {};
    (db as any).cloud = {
      options: {},
      currentUser: {
        subscribe: (listener: (user: any) => void) => {
          emit = listener;
          return { unsubscribe: () => {} };
        },
      },
    };

    const { getByTestId } = renderAuth();
    act(() => {
      emit({ isLoggedIn: true, email: 'me@example.com' });
    });

    expect(getByTestId('user')).toHaveTextContent('me@example.com');
  });

  it('does not report a user when the session is not logged in', () => {
    let emit: (user: any) => void = () => {};
    (db as any).cloud = {
      options: {},
      currentUser: {
        subscribe: (listener: (user: any) => void) => {
          emit = listener;
          return { unsubscribe: () => {} };
        },
      },
    };

    const { getByTestId } = renderAuth();
    act(() => {
      emit({ isLoggedIn: false, isLoading: true });
    });

    expect(getByTestId('user')).toHaveTextContent('none');
  });

  it('signs out through Dexie Cloud', async () => {
    const logout = vi.fn().mockResolvedValue(undefined);
    (db as any).cloud = { options: {}, logout };

    const { getByText } = renderAuth();
    await act(async () => {
      getByText('Sign out').click();
    });

    expect(logout).toHaveBeenCalledTimes(1);
  });
});
