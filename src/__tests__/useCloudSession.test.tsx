import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useCloudSession } from '@/hooks/useCloudSession';
import db from '@/db/dexie';

/**
 * db.cloud is absent under Vitest (the addon is not registered in tests), and that is
 * itself a case the hook must survive: it must settle as "signed out" rather than
 * leaving isLoading true forever, which would pin the app on the splash screen.
 */
describe('useCloudSession', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    delete (db as any).cloud;
  });

  it('settles as signed out when the cloud addon is unavailable', async () => {
    const { result } = renderHook(() => useCloudSession());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.isLoggedIn).toBe(false);
    expect(result.current.email).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it("opens the database, because the session is published on Dexie's ready event", async () => {
    // The addon only emits the persisted session once the database is open, and this
    // hook renders before the app does — so if it does not open the database, the gate
    // waits on isLoading forever and the app never leaves the splash screen.
    const openSpy = vi.spyOn(db, 'open').mockResolvedValue(db as never);
    renderHook(() => useCloudSession());

    await waitFor(() => expect(openSpy).toHaveBeenCalled());
  });

  it('reports an actionable error instead of spinning forever when the database will not open', async () => {
    // A rejected open used to leave isLoading true with only a console.error, so the app
    // sat on the splash screen with nothing the user could do.
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(db, 'open').mockRejectedValue(new Error('IndexedDB unavailable'));

    const { result } = renderHook(() => useCloudSession());

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.error).toMatch(/local storage/i);
    expect(result.current.isLoggedIn).toBe(false);

    consoleError.mockRestore();
  });

  it('reports the signed-in user when a session exists', async () => {
    let emit: (user: any) => void = () => {};
    (db as any).cloud = {
      currentUser: {
        subscribe: (listener: (user: any) => void) => {
          emit = listener;
          return { unsubscribe: () => {} };
        },
      },
    };
    vi.spyOn(db, 'open').mockResolvedValue(db as never);

    const { result } = renderHook(() => useCloudSession());
    emit({ isLoggedIn: true, email: 'me@example.com', isLoading: false });

    await waitFor(() => expect(result.current.isLoggedIn).toBe(true));
    expect(result.current.email).toBe('me@example.com');
  });

  it('does not let a later session emission mask a storage failure', async () => {
    let emit: (user: any) => void = () => {};
    (db as any).cloud = {
      currentUser: {
        subscribe: (listener: (user: any) => void) => {
          emit = listener;
          return { unsubscribe: () => {} };
        },
      },
    };
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(db, 'open').mockRejectedValue(new Error('IndexedDB unavailable'));

    const { result } = renderHook(() => useCloudSession());
    await waitFor(() => expect(result.current.error).not.toBeNull());

    emit({ isLoggedIn: true, email: 'me@example.com', isLoading: false });

    expect(result.current.error).not.toBeNull();
    consoleError.mockRestore();
  });
});
