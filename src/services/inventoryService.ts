import type { Batch, InventoryGroup } from '@/types';
import { getDB } from '@/db/database';

export async function getBatch(batchId: string): Promise<Batch | undefined> {
  const db = await getDB();
  return db.get('inventory', batchId);
}

export async function getAllBatches(): Promise<Batch[]> {
  const db = await getDB();
  return db.getAllFromIndex('inventory', 'by-expiry');
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

export async function getBatchCount(): Promise<number> {
  const db = await getDB();
  return db.count('inventory');
}

export async function deleteAllBatches(): Promise<void> {
  const db = await getDB();
  await db.clear('inventory');
}

function sortBatchesByFIFO(batches: Batch[]): Batch[] {
  return [...batches].sort((a, b) => {
    if (a.expiryDate !== b.expiryDate) return a.expiryDate.localeCompare(b.expiryDate);
    return a.scannedAt.localeCompare(b.scannedAt);
  });
}

export async function getInventoryGroups(): Promise<InventoryGroup[]> {
  const [allBatches, allProducts] = await Promise.all([getAllBatches(), (async () => {
    const db = await getDB();
    return db.getAll('catalog');
  })()]);

  const productMap = new Map(allProducts.map((p) => [p.barcode, p]));
  const groups = new Map<string, Batch[]>();

  for (const batch of allBatches) {
    const list = groups.get(batch.barcode) ?? [];
    list.push(batch);
    groups.set(batch.barcode, list);
  }

  const result: InventoryGroup[] = [];
  for (const [barcode, batches] of groups) {
    const product = productMap.get(barcode);
    if (!product) continue;
    const sorted = sortBatchesByFIFO(batches);
    result.push({
      product,
      batches: sorted,
      totalQuantity: sorted.reduce((sum, b) => sum + b.quantity, 0),
      earliestExpiry: sorted[0]!.expiryDate,
    });
  }

  result.sort((a, b) => a.earliestExpiry.localeCompare(b.earliestExpiry));
  return result;
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
