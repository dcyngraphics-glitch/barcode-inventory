import type { Batch, InventoryGroup } from '@/types';
import { getDB } from '@/db/database';
import { getProduct } from './catalogService';

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

  const groups: InventoryGroup[] = [];
  for (const [barcode, batches] of groupMap) {
    const product = await getProduct(barcode);
    if (!product) continue;

    const totalQuantity = batches.reduce((sum, b) => sum + b.quantity, 0);
    const earliestExpiry = batches[0]?.expiryDate ?? '';

    groups.push({ product, batches, totalQuantity, earliestExpiry });
  }

  return groups;
}
