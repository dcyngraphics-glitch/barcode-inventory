import type { Batch, InventoryGroup } from '@/types';
import { db } from '@/db/database';
import { productIdFor } from '@/utils/privateId';
import { getProduct } from './catalogService';

export async function getBatch(batchId: string): Promise<Batch | undefined> {
  return db.inventory.get(batchId);
}

export async function getAllBatches(): Promise<Batch[]> {
  return db.inventory.toArray();
}

export async function getBatchesByBarcode(barcode: string): Promise<Batch[]> {
  return db.inventory.where('barcode').equals(barcode).toArray();
}

export async function addBatch(batch: Batch): Promise<Batch> {
  await db.inventory.put(batch);
  return batch;
}

export async function updateBatch(batch: Batch): Promise<Batch> {
  await db.inventory.put(batch);
  return batch;
}

export async function deleteBatch(batchId: string): Promise<void> {
  await db.inventory.delete(batchId);
}

/**
 * Delete a batch and hand back the row that was removed, so the caller can offer an
 * undo. Mirrors how saleService keeps SaleDeduction snapshots so that undoLastSale
 * can recreate exactly what it deleted — one undo mechanism in this codebase, not two.
 */
export async function deleteBatchWithSnapshot(batchId: string): Promise<Batch | undefined> {
  const existing = await db.inventory.get(batchId);
  if (!existing) return undefined;
  await db.inventory.delete(batchId);
  return existing;
}

/**
 * Put a snapshot back. The batchId is preserved so any reference held elsewhere
 * still resolves. A put is naturally idempotent, so restoring twice cannot
 * duplicate the row.
 */
export async function restoreBatch(snapshot: Batch): Promise<void> {
  await db.inventory.put(snapshot);
}

export function sortBatchesByFIFO(batches: Batch[]): Batch[] {
  return [...batches].sort((a, b) => {
    if (a.expiryDate !== b.expiryDate) return a.expiryDate.localeCompare(b.expiryDate);
    return (a.scannedAt ?? '').localeCompare(b.scannedAt ?? '');
  });
}

export async function getExpiringBatches(days: number): Promise<Batch[]> {
  const all = await getAllBatches();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const cutoff = new Date(today.getTime() + days * 24 * 60 * 60 * 1000);
  cutoff.setHours(0, 0, 0, 0);

  return all.filter((batch) => {
    const expiry = new Date(batch.expiryDate);
    expiry.setHours(0, 0, 0, 0);
    return expiry <= cutoff;
  });
}

export async function getInventoryGroups(): Promise<InventoryGroup[]> {
  const allBatches = await getAllBatches();
  const sorted = sortBatchesByFIFO(allBatches);

  const groupMap = new Map<string, Batch[]>();
  for (const batch of sorted) {
    const existing = groupMap.get(batch.barcode) ?? [];
    existing.push(batch);
    groupMap.set(batch.barcode, existing);
  }

  // Batch-fetch all products in parallel to avoid N sequential awaits
  const barcodes = Array.from(groupMap.keys());
  const productPromises = barcodes.map((b) => getProduct(b));
  const products = await Promise.all(productPromises);

  const groups: InventoryGroup[] = [];
  for (let i = 0; i < barcodes.length; i++) {
    const barcode = barcodes[i]!;
    const batches = groupMap.get(barcode)!;
    const product = products[i];
    if (!product) {
      // Orphan batch with no catalog product — show with placeholder instead of dropping
      groups.push({
        product: {
          productId: productIdFor(barcode),
          barcode,
          name: 'Unknown Product',
          brand: '',
          category: '',
          storePrice: 0,
          defaultExpiry: '',
          source: 'manual',
          createdAt: '',
          updatedAt: '',
        },
        batches,
        totalQuantity: batches.reduce((s, b) => s + b.quantity, 0),
        earliestExpiry: batches[0]?.expiryDate ?? '',
      });
      continue;
    }

    const totalQuantity = batches.reduce((sum, b) => sum + b.quantity, 0);
    const earliestExpiry = batches[0]?.expiryDate ?? '';

    groups.push({ product, batches, totalQuantity, earliestExpiry });
  }

  return groups;
}
