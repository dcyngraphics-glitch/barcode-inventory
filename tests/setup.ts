import '@testing-library/jest-dom';
import 'fake-indexeddb/auto';
import { expect } from 'vitest';

const testPath = expect.getState().testPath || 'default';
const dbName = `barcode-inventory-${testPath.replace(/[^a-zA-Z0-9]/g, '-')}`;

// Delete any leftover database with the same name to prevent version conflicts
const deleteDB = (): Promise<void> => new Promise((resolve) => {
  try {
    const request = indexedDB.deleteDatabase(dbName);
    request.onerror = () => resolve();
    request.onsuccess = () => resolve();
    request.onblocked = () => resolve();
  } catch {
    resolve();
  }
});

await deleteDB();

// Also delete any leftover DB from the fake-indexeddb instance directly
try {
  const factory = (globalThis as any).indexedDB;
  if (factory && factory._databases) {
    for (const name of Array.from(factory._databases.keys())) {
      factory.deleteDatabase(name);
    }
    for (const name of Array.from(factory._databases.keys() || [])) {
      factory._databases.delete(name);
    }
  }
} catch {
  // ignore
}

(globalThis as any).__DB_NAME__ = dbName;
