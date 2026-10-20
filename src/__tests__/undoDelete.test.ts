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

/**
 * Includes the optional `notes` field on purpose — an undo that drops optional
 * fields is a silent data-loss bug, so the test must catch it.
 */
const batch: Batch = {
  batchId: 'batch-undo-1',
  barcode: '4800361394093',
  quantity: 4,
  expiryDate: '2026-01-01',
  scannedAt: '2025-12-01T00:00:00.000Z',
  notes: 'fridge',
};

/** A sibling row, so the tests can prove a delete hits only its target. */
const other: Batch = {
  batchId: 'batch-undo-2',
  barcode: '4800016640148',
  quantity: 1,
  expiryDate: '2026-06-01',
  scannedAt: '2025-12-02T00:00:00.000Z',
};

/**
 * NOTE ON TEST STRENGTH: every test below asserts the row count is 0 *between* the
 * delete and the restore. That assertion is load-bearing, not decoration. Without
 * it, a no-op delete leaves the row in place and the restore assertion passes for
 * free — the suite would be green against an implementation that does nothing at
 * all. Verified by stubbing both functions to no-ops: every test here fails.
 */
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
    expect(await getAllBatches()).toHaveLength(0); // prove the delete happened first

    await restoreBatch(snapshot!);

    const after = await getAllBatches();
    expect(after).toHaveLength(1);
    expect(after[0]).toEqual(batch); // notes and scannedAt preserved
  });

  it('deletes only the requested row, and does nothing for an unknown id', async () => {
    await addBatch(batch);
    await addBatch(other);

    // Unknown id: reports nothing and disturbs nothing.
    expect(await deleteBatchWithSnapshot('does-not-exist')).toBeUndefined();
    expect(await getAllBatches()).toHaveLength(2);

    // Real id: exactly that row goes, the sibling survives.
    const snapshot = await deleteBatchWithSnapshot('batch-undo-1');
    expect(snapshot?.batchId).toBe('batch-undo-1');

    const remaining = await getAllBatches();
    expect(remaining).toHaveLength(1);
    expect(remaining[0]?.batchId).toBe('batch-undo-2');
  });

  it('restoring twice does not duplicate the row', async () => {
    await addBatch(batch);
    const snapshot = await deleteBatchWithSnapshot('batch-undo-1');
    expect(await getAllBatches()).toHaveLength(0); // prove the delete happened first

    await restoreBatch(snapshot!);
    await restoreBatch(snapshot!);

    const after = await getAllBatches();
    expect(after).toHaveLength(1);
    expect(after[0]).toEqual(batch);
  });
});
