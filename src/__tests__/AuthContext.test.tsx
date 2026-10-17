import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, act } from '@testing-library/react';
import { useState } from 'react';
import { AuthProvider, useAuth } from '../context/AuthContext';
import db from '../db/dexie';

/**
 * AuthContext carries the sign-in ACTIONS only. The signed-in user lives in
 * useCloudSession — keeping the db.cloud.currentUser subscription in one place instead
 * of two avoids two sources of truth for the same fact.
 */
function TestConsumer() {
  const { cloudError, cloudLogin, cloudLogout } = useAuth();
  const [logoutError, setLogoutError] = useState('');
  return (
    <div>
      <div data-testid="error">{cloudError}</div>
      <div data-testid="logout-error">{logoutError}</div>
      <button onClick={cloudLogin}>Sign in</button>
      <button
        onClick={() => {
          cloudLogout().catch((err: Error) => setLogoutError(err.message));
        }}
      >
        Sign out
      </button>
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

  it('signs out through Dexie Cloud', async () => {
    const logout = vi.fn().mockResolvedValue(undefined);
    (db as any).cloud = { options: {}, logout };

    const { getByText } = renderAuth();
    await act(async () => {
      getByText('Sign out').click();
    });

    expect(logout).toHaveBeenCalledTimes(1);
  });

  it('propagates a rejected logout so the caller can tell a cancel from a failure', async () => {
    // The addon rejects logout when the user backs out of the "unsynced changes"
    // confirmation. Swallowing it would make a deliberate cancel look like success.
    const logout = vi.fn().mockRejectedValue(new Error('User cancelled logout due to unsynced changes'));
    (db as any).cloud = { options: {}, logout };

    const { getByText, getByTestId } = renderAuth();
    await act(async () => {
      getByText('Sign out').click();
    });

    expect(getByTestId('logout-error')).toHaveTextContent(/cancelled logout/i);
  });
});
