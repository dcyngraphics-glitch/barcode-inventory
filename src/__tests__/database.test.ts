import { describe, it, expect } from 'vitest';
import { getDB } from '../db/database';

describe('database', () => {
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
