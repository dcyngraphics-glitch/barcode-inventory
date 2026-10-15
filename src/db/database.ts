import db from './dexie';

// Export the Dexie instance for direct use
export { db };

// Keep the same API as before for compatibility
export function getDB() {
  return Promise.resolve(db);
}

export function resetDB() {
  // Delete the database and then the instance will reopen it on next use
  return db.delete().then(() => {
    // No further action needed
  });
}
