import { describe, it, expect, beforeEach } from 'vitest';
import { db, resetDB } from '@/db/database';

describe('dexie database', () => {
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
    // catalog is keyed by the per-account private ID ('#' + barcode), not the barcode.
    expect(db.catalog.schema.primKey.keyPath).toBe('productId');
    expect(db.inventory.schema.primKey.keyPath).toBe('batchId');
    expect(db.settings.schema.primKey.keyPath).toBe('id');
    expect(db.sales.schema.primKey.keyPath).toBe('saleId');
  });
});
