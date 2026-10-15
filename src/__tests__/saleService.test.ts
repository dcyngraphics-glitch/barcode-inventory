import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { resetDB } from '@/db/database';
import { addBatch, getAllBatches } from '@/services/inventoryService';
import { deductStockFIFO } from '@/services/saleService';

const batch = (batchId: string, qty: number, expiryDate: string, scannedAt: string) =>
  ({ batchId, barcode: 'B1', quantity: qty, expiryDate, scannedAt });

describe('deductStockFIFO', () => {
  beforeEach(async () => { resetDB(); });

  it('takes from the earliest expiry first', async () => {
    await addBatch(batch('late', 5, '2027-01-01', '2026-01-01T00:00:00.000Z'));
    await addBatch(batch('early', 5, '2026-06-01', '2026-01-01T00:00:00.000Z'));

    const { deductions, shortfall } = await deductStockFIFO('B1', 7);

    expect(shortfall).toBe(0);
    expect(deductions).toEqual([
      { batchId: 'early', quantity: 5, expiryDate: '2026-06-01', scannedAt: '2026-01-01T00:00:00.000Z' },
      { batchId: 'late', quantity: 2, expiryDate: '2027-01-01', scannedAt: '2026-01-01T00:00:00.000Z' },
    ]);

    const left = await getAllBatches();
    expect(left.find(b => b.batchId === 'early')).toBeUndefined();   // emptied → deleted
    expect(left.find(b => b.batchId === 'late')!.quantity).toBe(3);
  });

  it('records a shortfall instead of blocking when stock is insufficient', async () => {
    await addBatch(batch('only', 2, '2026-06-01', '2026-01-01T00:00:00.000Z'));
    const { deductions, shortfall } = await deductStockFIFO('B1', 5);
    expect(deductions[0]!.quantity).toBe(2);
    expect(shortfall).toBe(3);
  });

  it('returns a full shortfall when there is no stock at all', async () => {
    const { deductions, shortfall } = await deductStockFIFO('NOPE', 4);
    expect(deductions).toEqual([]);
    expect(shortfall).toBe(4);
  });
});
