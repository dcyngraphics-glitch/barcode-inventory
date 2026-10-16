import { describe, it, expect, beforeEach } from 'vitest';
import { db, getDB, resetDB } from '@/db/database';

describe('database', () => {
  beforeEach(async () => {
    await resetDB();
  });

  it('should have the expected tables', async () => {
    await db.open();
    const tableNames = db.tables.map(table => table.name);
    expect(tableNames).toEqual(expect.arrayContaining(['catalog', 'inventory', 'settings', 'sales']));
  });

  it('should have the expected primary keys', async () => {
    await db.open();
    expect(db.catalog.schema.primKey.keyPath).toBe('barcode');
    expect(db.inventory.schema.primKey.keyPath).toBe('batchId');
    expect(db.settings.schema.primKey.keyPath).toBe('id');
    expect(db.sales.schema.primKey.keyPath).toBe('saleId');
  });

  it('should have the expected indexes', async () => {
    await db.open();
    // catalog: index 'by-name' on 'name'
    expect(db.catalog.schema.indexes.by-name?.keyPath).toBe('name');
    // inventory: index 'by-barcode' on 'barcode', index 'by-expiry' on 'expiryDate'
    expect(db.inventory.schema.indexes.by-barcode?.keyPath).toBe('barcode');
    expect(db.inventory.schema.indexes.by-expiry?.keyPath).toBe('expiryDate');
    // sales: index 'by-day' on 'dayKey'
    expect(db.sales.schema.indexes.by-day?.keyPath).toBe('dayKey');
  });

  describe('getDB and resetDB', () => {
    it('getDB should return the Dexie instance', async () => {
      const dbFromGetDB = await getDB();
      expect(dbFromGetDB).toBe(db);
    });

    it('resetDB should delete the database', async () => {
      await db.open();
      await db.table('catalog').put({ barcode: 'test', name: 'test' });
      const countBefore = await db.catalog.count();
      expect(countBefore).toBe(1);
      await resetDB();
      await db.open();
      const countAfter = await db.catalog.count();
      expect(countAfter).toBe(0);
    });
  });
});
