import { getBatchesByBarcode, addBatch } from './inventoryService';
import { deductStockFIFO } from './saleService';
import { generateId } from '@/utils/helpers';

/** Total units of `barcode` currently in stock, across all batches. */
export async function getStockLevel(barcode: string): Promise<number> {
  const batches = await getBatchesByBarcode(barcode);
  return batches.reduce((sum, b) => sum + b.quantity, 0);
}

/**
 * Adjust stock so the total becomes `target`.
 *
 * Higher than current → add a batch for the difference.
 * Lower than current → remove the difference oldest-expiry-first (the same rule
 * sales use, so the two never disagree about which stock goes first).
 *
 * Lives here rather than in inventoryService or saleService because it needs both
 * and neither should import the other.
 *
 * Returns the resulting total.
 */
export async function setStock(
  barcode: string,
  target: number,
  expiryDate: string,
): Promise<number> {
  const wanted = Number.isFinite(target) ? Math.max(0, Math.floor(target)) : 0;
  const current = await getStockLevel(barcode);

  if (wanted === current) return current;

  if (wanted > current) {
    await addBatch({
      batchId: generateId(),
      barcode,
      quantity: wanted - current,
      expiryDate,
      scannedAt: new Date().toISOString(),
    });
    return wanted;
  }

  await deductStockFIFO(barcode, current - wanted);
  return wanted;
}
