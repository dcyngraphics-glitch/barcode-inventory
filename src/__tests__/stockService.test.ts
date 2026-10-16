import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { resetDB } from '@/db/database';
import { addBatch, getAllBatches } from '@/services/inventoryService';
import { getStockLevel, setStock } from '@/services/stockService';

const batch = (batchId: string, qty: number, expiryDate: string, barcode = 'B1') => ({
  batchId,
  barcode,
  quantity: qty,
  expiryDate,
  scannedAt: '2026-01-01T00:00:00.000Z',
});

const totalFor = async (barcode = 'B1') =>
  (await getAllBatches())
    .filter((b) => b.barcode === barcode)
    .reduce((sum, b) => sum + b.quantity, 0);

describe('setStock', () => {
  beforeEach(async () => {
    await resetDB();
  });

  it('reports the current stock level', async () => {
    await addBatch(batch('a', 4, '2026-06-01'));
    await addBatch(batch('b', 6, '2027-01-01'));

    expect(await getStockLevel('B1')).toBe(10);
  });

  it('adds stock when the target is higher', async () => {
    await addBatch(batch('a', 12, '2026-06-01'));

    await setStock('B1', 20, '2026-06-01');

    expect(await totalFor()).toBe(20);
  });

  it('removes oldest-expiry-first when the target is lower', async () => {
    await addBatch(batch('early', 5, '2026-06-01'));
    await addBatch(batch('late', 5, '2027-01-01'));

    await setStock('B1', 3, '2027-01-01');

    const left = await getAllBatches();
    expect(left.find((b) => b.batchId === 'early')).toBeUndefined(); // emptied → deleted
    expect(left.find((b) => b.batchId === 'late')!.quantity).toBe(3);
    expect(await totalFor()).toBe(3);
  });

  it('is a no-op when the target matches', async () => {
    await addBatch(batch('a', 7, '2026-06-01'));

    await setStock('B1', 7, '2026-06-01');

    const all = await getAllBatches();
    expect(all).toHaveLength(1);
    expect(all[0]!.quantity).toBe(7);
  });

  it('sets stock on a product that has none yet', async () => {
    await setStock('NEW', 5, '2026-06-01');

    expect(await totalFor('NEW')).toBe(5);
  });

  it('clamps a negative target to zero and empties the stock', async () => {
    await addBatch(batch('a', 4, '2026-06-01'));

    await setStock('B1', -5, '2026-06-01');

    expect(await totalFor()).toBe(0);
  });

  it('treats a non-finite target as zero rather than corrupting stock', async () => {
    await addBatch(batch('a', 4, '2026-06-01'));

    await setStock('B1', NaN, '2026-06-01');

    expect(await totalFor()).toBe(0);
  });
});
