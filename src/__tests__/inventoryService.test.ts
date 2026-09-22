import { describe, it, expect } from 'vitest';
import {
  addBatch,
  getBatchesByBarcode,
  getAllBatches,
  deleteBatch,
  getExpiringBatches,
  sortBatchesByFIFO,
} from '../services/inventoryService';
import type { Batch } from '../types';

const mockBatch: Batch = {
  batchId: 'batch-1',
  barcode: '1234567890123',
  quantity: 5,
  expiryDate: '2026-12-31',
  scannedAt: '2026-01-01T10:00:00.000Z',
};

describe('inventoryService', () => {
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
      expiryDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
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
    expect(sorted[0].batchId).toBe('b3');
    expect(sorted[1].batchId).toBe('b2');
    expect(sorted[2].batchId).toBe('b1');
  });

  it('should sort by scannedAt when expiry dates are equal', () => {
    const batches: Batch[] = [
      { ...mockBatch, batchId: 'b1', expiryDate: '2026-12-31', scannedAt: '2026-01-01T12:00:00Z' },
      { ...mockBatch, batchId: 'b2', expiryDate: '2026-12-31', scannedAt: '2026-01-01T08:00:00Z' },
      { ...mockBatch, batchId: 'b3', expiryDate: '2026-12-31', scannedAt: '2026-01-01T10:00:00Z' },
    ];
    const sorted = sortBatchesByFIFO(batches);
    expect(sorted[0].batchId).toBe('b2');
    expect(sorted[1].batchId).toBe('b3');
    expect(sorted[2].batchId).toBe('b1');
  });
});
