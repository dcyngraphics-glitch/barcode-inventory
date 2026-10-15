import type { SaleDeduction } from '@/types';
import { getBatchesByBarcode, sortBatchesByFIFO, updateBatch, deleteBatch } from './inventoryService';

export interface DeductResult {
  deductions: SaleDeduction[];
  shortfall: number;
}

/** Take `quantity` of `barcode` from stock, earliest expiry first.
 *  Never throws for insufficient stock — reports a shortfall instead, because a
 *  paying customer is never refused over a wrong count. */
export async function deductStockFIFO(barcode: string, quantity: number): Promise<DeductResult> {
  const batches = sortBatchesByFIFO(await getBatchesByBarcode(barcode));
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
      await deleteBatch(batch.batchId);
    } else {
      await updateBatch({ ...batch, quantity: left });
    }
    remaining -= take;
  }

  return { deductions, shortfall: Math.max(0, remaining) };
}
