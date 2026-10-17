import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { seedCatalogIfEmpty } from '@/services/seedService';
import { getAllProducts } from '@/services/catalogService';
import { db } from '@/db/database';
import { SETTINGS_ID } from '@/types';

/**
 * Seeding now runs per account, behind the login gate. Two things must hold:
 *  - it is idempotent, so signing in on a second phone does not double the catalog;
 *  - every seeded row carries the '#'-private primary key, which is what keeps two
 *    accounts on the same database from colliding on a shared barcode.
 */
describe('seedCatalogIfEmpty', () => {
  beforeEach(async () => {
    await db.table('catalog').clear();
    await db.table('settings').clear();
  });

  it('seeds the catalog on an empty database', async () => {
    await seedCatalogIfEmpty();
    expect((await getAllProducts()).length).toBeGreaterThan(0);
  });

  it('is idempotent — a second run does not duplicate rows', async () => {
    await seedCatalogIfEmpty();
    const afterFirst = (await getAllProducts()).length;

    await seedCatalogIfEmpty();

    expect((await getAllProducts()).length).toBe(afterFirst);
  });

  it('keys every seeded product by the per-account private ID', async () => {
    await seedCatalogIfEmpty();

    const rows = await db.catalog.toArray();
    expect(rows.length).toBeGreaterThan(0);
    for (const row of rows) {
      expect(row.productId).toBe(`#${row.barcode}`);
    }
  });

  it('records the seeded flag under the private settings key', async () => {
    await seedCatalogIfEmpty();

    const settings = await db.settings.get(SETTINGS_ID);
    expect(settings?.catalogSeeded).toBe(true);
  });

  it('does not seed again once the flag is set, even if the catalog is emptied', async () => {
    await seedCatalogIfEmpty();
    await db.table('catalog').clear();

    await seedCatalogIfEmpty();

    // The flag short-circuits before the catalog is consulted.
    expect((await getAllProducts()).length).toBe(0);
  });
});
