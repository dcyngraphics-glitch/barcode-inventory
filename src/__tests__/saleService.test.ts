import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import 'fake-indexeddb/auto';
import { resetDB } from '@/db/database';
import { addBatch, getAllBatches } from '@/services/inventoryService';
import {
  deductStockFIFO,
  recordSale,
  undoLastSale,
  getSale,
  getSalesForDay,
  getDayKeys,
  summarizeDay,
  type SaleLineInput,
} from '@/services/saleService';

const batch = (batchId: string, qty: number, expiryDate: string, scannedAt: string) =>
  ({ batchId, barcode: 'B1', quantity: qty, expiryDate, scannedAt });

describe('deductStockFIFO', () => {
  beforeEach(async () => { await resetDB(); });
  afterEach(() => { vi.restoreAllMocks(); });

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

  // --- Atomicity contract (FIX 1) ---

  it('deducts across multiple batches atomically — both batches updated in one transaction', async () => {
    await addBatch(batch('first', 5, '2026-06-01', '2026-01-01T00:00:00.000Z'));
    await addBatch(batch('second', 5, '2027-01-01', '2026-01-01T00:00:00.000Z'));

    const { deductions, shortfall } = await deductStockFIFO('B1', 7);

    expect(shortfall).toBe(0);
    expect(deductions).toHaveLength(2);
    expect(deductions[0]).toMatchObject({ batchId: 'first', quantity: 5 });
    expect(deductions[1]).toMatchObject({ batchId: 'second', quantity: 2 });

    const left = await getAllBatches();
    expect(left.find(b => b.batchId === 'first')).toBeUndefined();
    expect(left.find(b => b.batchId === 'second')!.quantity).toBe(3);
  });

  // NOTE: a mid-transaction write failure is not reliably constructible with
  // fake-indexeddb, so atomicity is covered by the two-batch contract test
  // above (both batches updated in one transaction) rather than by failure
  // injection. A test that cannot fail for the right reason is worse than none.

  // --- NaN guard (FIX 4) ---

  it('does not modify stock for NaN, negative, or zero quantity', async () => {
    await addBatch(batch('b1', 5, '2026-06-01', '2026-01-01T00:00:00.000Z'));

    const r1 = await deductStockFIFO('B1', NaN);
    expect(r1.shortfall).toBe(0);
    expect(r1.deductions).toEqual([]);

    const r2 = await deductStockFIFO('B1', -1);
    expect(r2.shortfall).toBe(0);
    expect(r2.deductions).toEqual([]);

    const r3 = await deductStockFIFO('B1', 0);
    expect(r3.shortfall).toBe(0);
    expect(r3.deductions).toEqual([]);

    const left = await getAllBatches();
    expect(left.find(b => b.batchId === 'b1')!.quantity).toBe(5);
  });
});

// --- Task D: recordSale ---

const line = (over: Partial<SaleLineInput> = {}): SaleLineInput => ({
  barcode: 'B1',
  name: 'Bear Brand',
  brand: 'Bear Brand',
  price: 12.5,
  quantity: 1,
  ...over,
});

describe('recordSale', () => {
  beforeEach(async () => { await resetDB(); });

  it('records a sale, snapshots the price, and deducts stock', async () => {
    await addBatch(batch('b1', 10, '2026-06-01', '2026-01-01T00:00:00.000Z'));

    const sale = await recordSale([line({ quantity: 2 })], new Date(2026, 9, 15, 14, 0, 0));

    expect(sale.total).toBe(25);            // 12.5 x 2
    expect(sale.itemCount).toBe(2);
    expect(sale.dayKey).toBe('2026-10-15');
    expect(sale.lines[0]!.unitPrice).toBe(12.5);
    expect(sale.lines[0]!.shortfall).toBe(0);

    const left = await getAllBatches();
    expect(left.find(b => b.batchId === 'b1')!.quantity).toBe(8);

    const today = await getSalesForDay('2026-10-15');
    expect(today).toHaveLength(1);
    expect(today[0]!.saleId).toBe(sale.saleId);
  });

  it('keeps the sale even when there is no stock to deduct', async () => {
    // A paying customer is never refused because the stock count is wrong.
    const sale = await recordSale([line({ barcode: 'GHOST', quantity: 2 })], new Date(2026, 9, 15));

    expect(sale.total).toBe(25);
    expect(sale.lines[0]!.shortfall).toBe(2);
    expect(sale.lines[0]!.deductions).toEqual([]);
  });

  it('records a multi-line sale and totals it', async () => {
    await addBatch(batch('b1', 10, '2026-06-01', '2026-01-01T00:00:00.000Z'));

    const sale = await recordSale(
      [line({ quantity: 2 }), line({ barcode: 'B2', name: 'Skyflakes', price: 8, quantity: 3 })],
      new Date(2026, 9, 15),
    );

    expect(sale.lines).toHaveLength(2);
    expect(sale.total).toBe(25 + 24);
    expect(sale.itemCount).toBe(5);
  });
});

// --- Task E: undoLastSale ---

describe('undoLastSale', () => {
  beforeEach(async () => { await resetDB(); });

  it('restores stock to the exact batch it came from', async () => {
    await addBatch(batch('b1', 10, '2026-06-01', '2026-01-01T00:00:00.000Z'));
    const sale = await recordSale([line({ quantity: 4 })], new Date(2026, 9, 15));
    expect((await getAllBatches()).find(b => b.batchId === 'b1')!.quantity).toBe(6);

    await undoLastSale(sale.saleId);

    expect((await getAllBatches()).find(b => b.batchId === 'b1')!.quantity).toBe(10);
    expect(await getSale(sale.saleId)).toBeUndefined();
  });

  it('recreates a batch that had been deleted at zero', async () => {
    await addBatch(batch('b1', 3, '2026-06-01', '2026-01-01T00:00:00.000Z'));
    const sale = await recordSale([line({ quantity: 3 })], new Date(2026, 9, 15));
    expect((await getAllBatches()).find(b => b.batchId === 'b1')).toBeUndefined();

    await undoLastSale(sale.saleId);

    const restored = (await getAllBatches()).find(b => b.batchId === 'b1');
    expect(restored!.quantity).toBe(3);
    expect(restored!.expiryDate).toBe('2026-06-01');   // recreated from the snapshot
  });

  it('is a no-op for an unknown sale id', async () => {
    await expect(undoLastSale('does-not-exist')).resolves.toBeUndefined();
  });

  it('does not touch stock for a sale that deducted nothing', async () => {
    await addBatch(batch('b1', 5, '2026-06-01', '2026-01-01T00:00:00.000Z'));
    const sale = await recordSale([line({ barcode: 'GHOST', quantity: 2 })], new Date(2026, 9, 15));

    await undoLastSale(sale.saleId);

    expect((await getAllBatches()).find(b => b.batchId === 'b1')!.quantity).toBe(5);
  });
});

// --- Task F: reporting ---

describe('sales reporting', () => {
  beforeEach(async () => { await resetDB(); });

  it('scopes sales to a day and lists days newest-first', async () => {
    await recordSale([line()], new Date(2026, 9, 15, 10, 0, 0));
    await recordSale([line()], new Date(2026, 9, 16, 10, 0, 0));

    expect(await getSalesForDay('2026-10-15')).toHaveLength(1);
    expect(await getSalesForDay('2026-10-16')).toHaveLength(1);
    expect(await getDayKeys()).toEqual(['2026-10-16', '2026-10-15']);
  });

  it('summarises a day', async () => {
    // Stock the item first, otherwise the sale legitimately records a shortfall.
    await addBatch(batch('b1', 10, '2026-06-01', '2026-01-01T00:00:00.000Z'));
    await recordSale([line({ quantity: 2, price: 10 })], new Date(2026, 9, 15));

    const sum = summarizeDay(await getSalesForDay('2026-10-15'));

    expect(sum.total).toBe(20);
    expect(sum.saleCount).toBe(1);
    expect(sum.itemCount).toBe(2);
    expect(sum.topSellers[0]).toEqual({ name: 'Bear Brand', quantity: 2 });
    expect(sum.shortfalls).toEqual([]);
  });

  it('flags items sold without stock', async () => {
    await recordSale([line({ barcode: 'GHOST', quantity: 3 })], new Date(2026, 9, 15));

    const sum = summarizeDay(await getSalesForDay('2026-10-15'));

    expect(sum.shortfalls).toEqual([{ name: 'Bear Brand', quantity: 3 }]);
  });

  it('summarises an empty day without throwing', () => {
    const sum = summarizeDay([]);
    expect(sum).toEqual({ total: 0, saleCount: 0, itemCount: 0, topSellers: [], shortfalls: [] });
  });
});
