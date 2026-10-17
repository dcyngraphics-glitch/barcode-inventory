import { describe, it, expect } from 'vitest';
import Dexie from 'dexie';
import { DEFAULT_DATABASE_NAME } from '@/db/dexie';

/**
 * The account-login design changes the SHAPE of two primary keys (catalog moves from
 * the bare barcode to '#' + barcode; settings moves from 'settings' to '#settings').
 * IndexedDB cannot alter a key path in place, so the approved wipe is implemented by
 * giving the local database a new name rather than by an upgrade callback.
 *
 * These two tests pin the reasoning so it cannot be undone by accident.
 */
describe('primary-key change handling', () => {
  it('Dexie refuses to change a primary key in place — the reason the local name was bumped', async () => {
    const probe = 'pk-change-probe';

    const legacy = new Dexie(probe);
    legacy.version(10).stores({ catalog: '&barcode, name' });
    await legacy.table('catalog').put({ barcode: 'x', name: 'x' });
    legacy.close();

    // Same database, same version bump we ship — but an altered primary key.
    const changed = new Dexie(probe);
    changed.version(11).stores({ catalog: '&productId, barcode, name' });
    await expect(changed.open()).rejects.toThrow(/primary key/i);

    await Dexie.delete(probe);
  });

  it('uses a fresh local database name so that upgrade is never attempted', () => {
    // 'barcode-inventory' is a v10 database; opening it at v11 throws UpgradeError and
    // would hard-fail every device that already had data. The suffix is load-bearing —
    // do not "tidy" it away.
    expect(DEFAULT_DATABASE_NAME).not.toBe('barcode-inventory');
    expect(DEFAULT_DATABASE_NAME).toBe('barcode-inventory-v2');
  });
});
