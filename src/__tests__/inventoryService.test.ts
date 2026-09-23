import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import {
  addBatch,
  getBatchesByBarcode,
  getAllBatches,
  deleteBatch,
  getExpiringBatches,
  sortBatchesByFIFO,
  getInventoryGroups,
} from '../services/inventoryService';
import { saveProduct } from '../services/catalogService';
import { getDB } from '../db/database';
import type { Batch, Product } from '../types';

const mockBatch: Batch = {
  batchId: 'batch-1',
  barcode: '1234567890123',
  quantity: 5,
  expiryDate: '2026-12-31',
  scannedAt: '2026-01-01T10:00:00.000Z',
};

describe('inventoryService', () => {
  beforeEach(async () => {
    const db = await getDB();
    await db.clear('catalog');
    await db.clear('inventory');
    await db.clear('settings');
  });
  it('should add and retrieve a batch by barcode', async () => {
    await addBatch(mockBatch);
    const batches = await getBatchesByBarcode(mockBatch.barcode);
    expect(batches.length).toBe(1);
    expect(batches[0]).toEqual(mockBatch);
  });

  it('should get all batches', async () => {
    await addBatch(mockBatch);
    const all = await getAllBatches();
    expect(all.length).toBeGreaterThan(0);
  });

  it('should delete a batch', async () => {
    await addBatch(mockBatch);
    await deleteBatch(mockBatch.batchId);
    const batches = await getBatchesByBarcode(mockBatch.barcode);
    expect(batches.length).toBe(0);
  });

  it('should get expiring batches within window', async () => {
    const expiringBatch: Batch = {
      ...mockBatch,
      batchId: 'batch-expiring',
      expiryDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]!,
    };
    await addBatch(expiringBatch);
    const expiring = await getExpiringBatches(3);
    expect(expiring.length).toBeGreaterThan(0);
    expect(expiring.find(b => b.batchId === 'batch-expiring')).toBeDefined();
  });

  it('should sort batches by FIFO (earliest expiry first)', () => {
    const batches: Batch[] = [
      { ...mockBatch, batchId: 'b1', expiryDate: '2026-12-31', scannedAt: '2026-01-01T10:00:00Z' },
      { ...mockBatch, batchId: 'b2', expiryDate: '2026-12-30', scannedAt: '2026-01-01T09:00:00Z' },
      { ...mockBatch, batchId: 'b3', expiryDate: '2026-12-30', scannedAt: '2026-01-01T08:00:00Z' },
    ];
    const sorted = sortBatchesByFIFO(batches);
    expect(sorted[0]!.batchId).toBe('b3');
    expect(sorted[1]!.batchId).toBe('b2');
    expect(sorted[2]!.batchId).toBe('b1');
  });

  it('should sort by scannedAt when expiry dates are equal', () => {
    const batches: Batch[] = [
      { ...mockBatch, batchId: 'b1', expiryDate: '2026-12-31', scannedAt: '2026-01-01T12:00:00Z' },
      { ...mockBatch, batchId: 'b2', expiryDate: '2026-12-31', scannedAt: '2026-01-01T08:00:00Z' },
      { ...mockBatch, batchId: 'b3', expiryDate: '2026-12-31', scannedAt: '2026-01-01T10:00:00Z' },
    ];
    const sorted = sortBatchesByFIFO(batches);
    expect(sorted[0]!.batchId).toBe('b2');
    expect(sorted[1]!.batchId).toBe('b3');
    expect(sorted[2]!.batchId).toBe('b1');
  });

  it('should group batches by product with FIFO sorting and correct totals', async () => {
    const product: Product = {
      barcode: '111',
      name: 'Group Test',
      brand: 'Brand',
      category: 'Cat',
      storePrice: 5,
      defaultExpiry: '2026-12-31',
      source: 'local',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    };
    await saveProduct(product);

    const b1: Batch = { ...mockBatch, batchId: 'g1', barcode: '111', quantity: 3, expiryDate: '2026-12-31', scannedAt: '2026-01-01T10:00:00Z' };
    const b2: Batch = { ...mockBatch, batchId: 'g2', barcode: '111', quantity: 2, expiryDate: '2026-12-28', scannedAt: '2026-01-01T09:00:00Z' };
    const b3: Batch = { ...mockBatch, batchId: 'g3', barcode: '111', quantity: 5, expiryDate: '2026-12-30', scannedAt: '2026-01-01T08:00:00Z' };

    await addBatch(b1);
    await addBatch(b2);
    await addBatch(b3);

    const groups = await getInventoryGroups();
    expect(groups.length).toBe(1);
    const group = groups[0]!;
    expect(group.product.barcode).toBe('111');
    expect(group.totalQuantity).toBe(10);
    expect(group.earliestExpiry).toBe('2026-12-28');
    // FIFO: earliest expiry first
    expect(group.batches[0]!.batchId).toBe('g2');
    expect(group.batches[1]!.batchId).toBe('g3');
    expect(group.batches[2]!.batchId).toBe('g1');
  });

  it('should include orphan batches with placeholder product when not in catalog', async () => {
    const orphanBatch: Batch = { ...mockBatch, batchId: 'orphan', barcode: 'no-such-product', quantity: 1, expiryDate: '2026-12-31', scannedAt: '2026-01-01T10:00:00Z' };
    await addBatch(orphanBatch);
    const groups = await getInventoryGroups();
    // Orphan batches should NOT be silently dropped — show with placeholder
    expect(groups.length).toBe(1);
    expect(groups[0]!.product.name).toBe('Unknown Product');
    expect(groups[0]!.product.barcode).toBe('no-such-product');
    expect(groups[0]!.batches[0]!.batchId).toBe('orphan');
  });
});
