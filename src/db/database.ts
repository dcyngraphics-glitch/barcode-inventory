import db from './dexie';

// Export the Dexie instance for direct use
export { db };

// Keep the same API as before for compatibility
export function getDB() {
  return Promise.resolve(db);
}

export async function resetDB() {
  console.log('[resetDB] Closing database...');
  db.close();
  console.log('[resetDB] Deleting database...');
  await db.delete();
  console.log('[resetDB] Database deleted.');
  console.log('[resetDB] Reopening database...');
  await db.open();
  console.log('[resetDB] Database reopened and ready.');
}
