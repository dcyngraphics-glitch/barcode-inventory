import { describe, it, expect, beforeEach } from 'vitest';
import { getDB, resetDB } from '../db/database';

describe('database', () => {
  beforeEach(() => { resetDB(); });

  it('should create catalog store', async () => {
    const db = await getDB();
    expect(db.objectStoreNames.contains('catalog')).toBe(true);
  });

  it('should create inventory store', async () => {
    const db = await getDB();
    expect(db.objectStoreNames.contains('inventory')).toBe(true);
  });

  it('should create settings store', async () => {
    const db = await getDB();
    expect(db.objectStoreNames.contains('settings')).toBe(true);
  });

  it('should create by-name index on catalog', async () => {
    const db = await getDB();
    const catalogStore = db.transaction('catalog').objectStore('catalog');
    expect(catalogStore.indexNames.contains('by-name')).toBe(true);
  });

  it('should create by-barcode index on inventory', async () => {
    const db = await getDB();
    const inventoryStore = db.transaction('inventory').objectStore('inventory');
    expect(inventoryStore.indexNames.contains('by-barcode')).toBe(true);
  });

  it('should create by-expiry index on inventory', async () => {
    const db = await getDB();
    const inventoryStore = db.transaction('inventory').objectStore('inventory');
    expect(inventoryStore.indexNames.contains('by-expiry')).toBe(true);
  });
});

describe('database v2', () => {
  beforeEach(() => { resetDB(); });

  it('exposes a sales store indexed by day', async () => {
    const db = await getDB();
    expect(db.objectStoreNames.contains('sales')).toBe(true);
    const tx = db.transaction('sales');
    expect(tx.store.indexNames.contains('by-day')).toBe(true);
  });
});
