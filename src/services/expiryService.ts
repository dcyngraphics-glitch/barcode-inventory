import type { Settings, NotificationItem, ExpiryStatus, Batch } from '@/types';
import { getAllBatches } from './inventoryService';
import { getProduct } from './catalogService';

export function getExpiryStatus(expiryDate: string, alertWindow: number): ExpiryStatus {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = new Date(expiryDate);
  expiry.setHours(0, 0, 0, 0);
  const diffDays = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return 'expired';
  if (diffDays <= alertWindow) return 'expiring-soon';
  return 'good';
}

export function getDaysUntilExpiry(expiryDate: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = new Date(expiryDate);
  expiry.setHours(0, 0, 0, 0);
  return Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

export async function checkExpiryAlerts(settings: Settings): Promise<NotificationItem[]> {
  const batches = await getAllBatches();
  const alerts: NotificationItem[] = [];

  for (const batch of batches) {
    const status = getExpiryStatus(batch.expiryDate, settings.alertWindow);
    if (status === 'good') continue;

    const product = await getProduct(batch.barcode);
    alerts.push({
      batchId: batch.batchId,
      barcode: batch.barcode,
      productName: product?.name ?? 'Unknown Product',
      expiryDate: batch.expiryDate,
      daysUntilExpiry: getDaysUntilExpiry(batch.expiryDate),
      read: false,
    });
  }

  return alerts.sort((a, b) => a.daysUntilExpiry - b.daysUntilExpiry);
}

export function formatExpiryLabel(daysUntilExpiry: number): string {
  if (daysUntilExpiry < 0) return `Expired ${Math.abs(daysUntilExpiry)} day${Math.abs(daysUntilExpiry) !== 1 ? 's' : ''} ago`;
  if (daysUntilExpiry === 0) return 'Expires today';
  if (daysUntilExpiry === 1) return 'Expires tomorrow';
  return `Expires in ${daysUntilExpiry} days`;
}

export function sortBatchesByFIFO(batches: Batch[]): Batch[] {
  return [...batches].sort((a, b) => {
    if (a.expiryDate !== b.expiryDate) return a.expiryDate.localeCompare(b.expiryDate);
    return a.scannedAt.localeCompare(b.scannedAt);
  });
}

export function aggregateProductBatches(batches: Batch[]): Map<string, Batch[]> {
  const map = new Map<string, Batch[]>();
  for (const batch of batches) {
    const list = map.get(batch.barcode) ?? [];
    list.push(batch);
    map.set(batch.barcode, list);
  }
  for (const list of map.values()) {
    sortBatchesByFIFO(list);
  }
  return map;
}
