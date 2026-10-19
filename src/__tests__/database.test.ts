import { describe, it, expect, beforeEach } from 'vitest';
import { db, getDB, resetDB } from '@/db/database';
import { SETTINGS_ID } from '@/types';

describe('database', () => {
  beforeEach(async () => {
    await resetDB();
  });

  it('should have the expected tables', async () => {
    await db.open();
    const tableNames = db.tables.map(table => table.name);
    expect(tableNames).toEqual(expect.arrayContaining(['products', 'inventory', 'settings', 'sales']));
    // The table must NOT be called `catalog`. Dexie Cloud keeps a table's primary key
    // forever — even after deletion — and the cloud database registered `catalog` as
    // keyed by `barcode`, so any table named `catalog` gets its syncs rejected with
    // 422 "Illegal to change primary key". See src/db/dexie.ts.
    expect(tableNames).not.toContain('catalog');
  });

  it('should have the expected primary keys', async () => {
    await db.open();
    // Keyed by the per-account private ID ('#' + barcode), not the shared barcode itself.
    expect(db.products.schema.primKey.keyPath).toBe('productId');
    expect(db.inventory.schema.primKey.keyPath).toBe('batchId');
    expect(db.settings.schema.primKey.keyPath).toBe('id');
    expect(db.sales.schema.primKey.keyPath).toBe('saleId');
  });

  it('should have the expected indexes', async () => {
    await db.open();
    // schema.indexes is an array of IndexSpec ({ name, keyPath }), not a name→spec map.
    // products: index on 'name'
    expect(db.products.schema.indexes.find((i) => i.name === 'name')?.keyPath).toBe('name');
    // inventory: index on 'barcode', index on 'expiryDate'
    expect(db.inventory.schema.indexes.find((i) => i.name === 'barcode')?.keyPath).toBe('barcode');
    expect(db.inventory.schema.indexes.find((i) => i.name === 'expiryDate')?.keyPath).toBe('expiryDate');
    // sales: index on 'dayKey'
    expect(db.sales.schema.indexes.find((i) => i.name === 'dayKey')?.keyPath).toBe('dayKey');
  });

  it('should key settings by a per-account private ID', () => {
    // '#' makes Dexie Cloud namespace this key per user. Without it, every account on
    // the database would share the single row keyed 'settings'.
    expect(SETTINGS_ID).toBe('#settings');
  });

  describe('getDB and resetDB', () => {
    it('getDB should return the Dexie instance', async () => {
      const dbFromGetDB = await getDB();
      expect(dbFromGetDB).toBe(db);
    });

    it('resetDB should delete the database', async () => {
      await db.open();
      await db.table('products').put({ productId: '#test', barcode: 'test', name: 'test' });
      const countBefore = await db.products.count();
      expect(countBefore).toBe(1);
      await resetDB();
      await db.open();
      const countAfter = await db.products.count();
      expect(countAfter).toBe(0);
    });
  });
});
