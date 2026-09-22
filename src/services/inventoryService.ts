import type { Batch } from '@/types';
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
