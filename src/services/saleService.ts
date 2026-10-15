import type { SaleDeduction } from '@/types';
import { sortBatchesByFIFO } from './inventoryService';
import { getDB } from '@/db/database';

export interface DeductResult {
  deductions: SaleDeduction[];
  shortfall: number;
}

/** Take `quantity` of `barcode` from stock, earliest expiry first.
 *  Never throws for insufficient stock — reports a shortfall instead, because a
 *  paying customer is never refused over a wrong count.
 *
 *  All reads and writes happen inside a single IndexedDB readwrite transaction
 *  so that a mid-loop failure (quota error, tab close, exception) leaves stock
 *  untouched rather than partially deducted. */
export async function deductStockFIFO(barcode: string, quantity: number): Promise<DeductResult> {
  if (!Number.isFinite(quantity) || quantity <= 0) {
    return { deductions: [], shortfall: Number.isFinite(quantity) ? Math.max(0, quantity) : 0 };
  }

  const db = await getDB();
  const tx = db.transaction('inventory', 'readwrite');
  const store = tx.objectStore('inventory');
  const batches = sortBatchesByFIFO(await store.index('by-barcode').getAll(barcode));

  const deductions: SaleDeduction[] = [];
  let remaining = quantity;

  for (const batch of batches) {
    if (remaining <= 0) break;
    const take = Math.min(batch.quantity, remaining);
    if (take <= 0) continue;

    deductions.push({
      batchId: batch.batchId,
      quantity: take,
      expiryDate: batch.expiryDate,
      scannedAt: batch.scannedAt,
    });

    const left = batch.quantity - take;
    if (left === 0) {
      await store.delete(batch.batchId);
    } else {
      await store.put({ ...batch, quantity: left });
    }
    remaining -= take;
  }

  await tx.done;
  return { deductions, shortfall: Math.max(0, remaining) };
}
