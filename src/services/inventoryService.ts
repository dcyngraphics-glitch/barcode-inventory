import type { Batch, InventoryGroup } from '@/types';
import { getDB } from '@/db/database';
import { getProduct } from './catalogService';

export async function getBatch(batchId: string): Promise<Batch | undefined> {
  const db = await getDB();
  return db.get('inventory', batchId);
}

export async function getAllBatches(): Promise<Batch[]> {
  const db = await getDB();
  return db.getAll('inventory');
}

export async function getBatchesByBarcode(barcode: string): Promise<Batch[]> {
  const db = await getDB();
  return db.getAllFromIndex('inventory', 'by-barcode', barcode);
}

export async function addBatch(batch: Batch): Promise<Batch> {
  const db = await getDB();
  await db.put('inventory', batch);
  return batch;
}

export async function updateBatch(batch: Batch): Promise<Batch> {
  const db = await getDB();
  await db.put('inventory', batch);
  return batch;
}

export async function deleteBatch(batchId: string): Promise<void> {
  const db = await getDB();
  await db.delete('inventory', batchId);
}

export function sortBatchesByFIFO(batches: Batch[]): Batch[] {
  return [...batches].sort((a, b) => {
    if (a.expiryDate !== b.expiryDate) return a.expiryDate.localeCompare(b.expiryDate);
    return a.scannedAt.localeCompare(b.scannedAt);
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
