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

export async function getBatchCount(): Promise<number> {
  const db = await getDB();
  return db.count('inventory');
}

export async function deleteAllBatches(): Promise<void> {
  const db = await getDB();
  await db.clear('inventory');
}
