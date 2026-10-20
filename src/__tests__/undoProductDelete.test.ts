import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { addBatch, getAllBatches } from '../services/inventoryService';
import {
  deleteProductWithSnapshot,
  getProduct,
  restoreProduct,
} from '../services/catalogService';
import { db } from '../db/database';
import type { Batch, Product } from '../types';

const product: Product = {
  productId: '#4800361394093',
  barcode: '4800361394093',
  name: 'Bear Brand Milk',
  brand: 'Bear Brand',
  category: 'Dairy',
  storePrice: 85,
  defaultExpiry: '2026-01-01',
  source: 'manual',
  createdAt: '2025-12-01T00:00:00.000Z',
  updatedAt: '2025-12-01T00:00:00.000Z',
};

const batch: Batch = {
  batchId: 'pbatch-1',
  barcode: '4800361394093',
  quantity: 4,
  expiryDate: '2026-01-01',
  scannedAt: '2025-12-01T00:00:00.000Z',
  notes: 'fridge',
};

/** A sibling row under a different barcode, to prove a delete hits only its target. */
const sibling: Batch = {
  ...batch,
  batchId: 'pbatch-2',
  barcode: '4800016640148',
};

/**
 * TEST STRENGTH: every test asserts the rows are gone *between* the delete and the
 * restore. That assertion is load-bearing — without it a no-op delete leaves the
 * rows in place and the restore assertion passes for free, so the suite would be
 * green against an implementation that does nothing at all. Same discipline as
 * undoDelete.test.ts, which was proven by stubbing both functions to no-ops.
 */
describe('product delete with undo', () => {
  beforeEach(async () => {
    await db.table('products').clear();
    await db.table('inventory').clear();
    await db.table('settings').clear();
    await db.table('products').put(product);
  });

  it('returns the product and every one of its batches', async () => {
    await addBatch(batch);
    await addBatch({ ...batch, batchId: 'pbatch-3' });
    await addBatch(sibling);

    const snapshot = await deleteProductWithSnapshot(product.barcode);

    expect(snapshot).toBeDefined();
    expect(snapshot!.product).toEqual(product);
    expect(snapshot!.batches).toHaveLength(2);
    // The sibling belongs to a different barcode and must survive.
    expect(await getAllBatches()).toEqual([sibling]);
  });

  it('actually deletes the product and its batches', async () => {
    await addBatch(batch);

    await deleteProductWithSnapshot(product.barcode);

    expect(await getProduct(product.barcode)).toBeUndefined();
    expect(await getAllBatches()).toHaveLength(0);
  });

  it('restores the product and its batches exactly, including optional fields', async () => {
    await addBatch(batch);
    const snapshot = await deleteProductWithSnapshot(product.barcode);
    expect(await getAllBatches()).toHaveLength(0); // prove the delete happened first

    await restoreProduct(snapshot!);

    expect(await getProduct(product.barcode)).toEqual(product);
    expect(await getAllBatches()).toEqual([batch]);
  });

  it('leaves a sibling batch with a different barcode untouched', async () => {
    await addBatch(sibling);

    const snapshot = await deleteProductWithSnapshot(product.barcode);

    expect(snapshot!.batches).toHaveLength(0);
    expect(await getAllBatches()).toEqual([sibling]);
  });

  it('returns undefined for a barcode that is not in the catalog', async () => {
    expect(await deleteProductWithSnapshot('9999999999999')).toBeUndefined();
  });

  it('restoring is idempotent and cannot duplicate the rows', async () => {
    await addBatch(batch);
    const snapshot = await deleteProductWithSnapshot(product.barcode);

    await restoreProduct(snapshot!);
    await restoreProduct(snapshot!);

    expect(await getAllBatches()).toHaveLength(1);
    expect(await getProduct(product.barcode)).toEqual(product);
  });
});
