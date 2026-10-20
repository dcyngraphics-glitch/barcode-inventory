import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import {
  addBatch,
  getAllBatches,
  deleteBatchWithSnapshot,
  restoreBatch,
} from '../services/inventoryService';
import { db } from '../db/database';
import type { Batch } from '../types';

/** Includes the optional `notes` field on purpose — an undo that drops optional
 *  fields is a silent data-loss bug, so the test must catch it. */
const batch: Batch = {
  batchId: 'batch-undo-1',
  barcode: '4800361394093',
  quantity: 4,
  expiryDate: '2026-01-01',
  scannedAt: '2025-12-01T00:00:00.000Z',
  notes: 'fridge',
};

describe('batch delete with undo', () => {
  beforeEach(async () => {
    await db.table('products').clear();
    await db.table('inventory').clear();
    await db.table('settings').clear();
  });

  it('returns the deleted row so the caller can offer an undo', async () => {
    await addBatch(batch);

    const snapshot = await deleteBatchWithSnapshot('batch-undo-1');

    expect(snapshot).toEqual(batch);
    expect(await getAllBatches()).toHaveLength(0);
  });

  it('restores the exact row, including optional fields', async () => {
    await addBatch(batch);
    const snapshot = await deleteBatchWithSnapshot('batch-undo-1');

    await restoreBatch(snapshot!);

    const after = await getAllBatches();
    expect(after).toHaveLength(1);
    expect(after[0]).toEqual(batch); // notes and scannedAt preserved
  });

  it('returns undefined for a batch that does not exist, and deletes nothing', async () => {
    await addBatch(batch);

    const snapshot = await deleteBatchWithSnapshot('does-not-exist');

    expect(snapshot).toBeUndefined();
    expect(await getAllBatches()).toHaveLength(1);
  });

  it('is idempotent-safe: restoring twice does not duplicate the row', async () => {
    await addBatch(batch);
    const snapshot = await deleteBatchWithSnapshot('batch-undo-1');

    await restoreBatch(snapshot!);
    await restoreBatch(snapshot!);

    expect(await getAllBatches()).toHaveLength(1);
  });
});
