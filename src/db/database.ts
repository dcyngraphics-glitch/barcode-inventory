import { openDB, DBSchema, IDBPDatabase } from 'idb';
import type { Product, Batch, Settings } from '@/types';

export interface BarcodeInventoryDB extends DBSchema {
  catalog: {
    key: string;
    value: Product;
    indexes: { 'by-name': string };
  };
  inventory: {
    key: string;
    value: Batch;
    indexes: { 'by-barcode': string; 'by-expiry': string };
  };
  settings: {
    key: string;
    value: Settings;
  };
}

const DB_NAME = 'barcode-inventory';
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<BarcodeInventoryDB>> | null = null;

export function getDB(): Promise<IDBPDatabase<BarcodeInventoryDB>> {
  if (typeof indexedDB === 'undefined') {
    return Promise.reject(new Error('IndexedDB is not available in this environment'));
  }
  if (!dbPromise) {
    dbPromise = openDB<BarcodeInventoryDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('catalog')) {
          const catalogStore = db.createObjectStore('catalog', { keyPath: 'barcode' });
          catalogStore.createIndex('by-name', 'name');
        }
        if (!db.objectStoreNames.contains('inventory')) {
          const inventoryStore = db.createObjectStore('inventory', { keyPath: 'batchId' });
          inventoryStore.createIndex('by-barcode', 'barcode');
          inventoryStore.createIndex('by-expiry', 'expiryDate');
        }
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings', { keyPath: 'id' });
        }
      },
    });
  }
  return dbPromise;
}
