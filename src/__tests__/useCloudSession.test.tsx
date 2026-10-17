import { describe, it, expect, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useCloudSession } from '@/hooks/useCloudSession';
import db from '@/db/dexie';

/**
 * db.cloud is absent under Vitest (the addon is not registered in tests), and that is
 * itself a case the hook must survive: it must settle as "signed out" rather than
 * leaving isLoading true forever, which would pin the app on the splash screen.
 */
describe('useCloudSession', () => {
  it('settles as signed out when the cloud addon is unavailable', async () => {
    const { result } = renderHook(() => useCloudSession());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.isLoggedIn).toBe(false);
    expect(result.current.email).toBeNull();
  });

  it('opens the database, because the session is published on Dexie\'s ready event', async () => {
    // The addon only emits the persisted session once the database is open, and this
    // hook renders before the app does — so if it does not open the database, the gate
    // waits on isLoading forever and the app never leaves the splash screen.
    const openSpy = vi.spyOn(db, 'open');
    renderHook(() => useCloudSession());

    await waitFor(() => expect(openSpy).toHaveBeenCalled());

    openSpy.mockRestore();
  });
});
