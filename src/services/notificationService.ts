import type { Settings, NotificationItem, ExpiryStatus, Batch } from '@/types';
import { getProduct } from './catalogService';
import { getExpiringBatches } from './inventoryService';

export function calculateExpiryStatus(expiryDate: string, alertWindowDays: number): ExpiryStatus {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = new Date(expiryDate);
  expiry.setHours(0, 0, 0, 0);
  const diffDays = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return 'expired';
  if (diffDays <= alertWindowDays) return 'expiring';
  return 'good';
}

export function getDaysUntilExpiry(expiryDate: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = new Date(expiryDate);
  expiry.setHours(0, 0, 0, 0);
  return Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

export async function requestPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) {
    return 'denied';
  }
  return Notification.requestPermission();
}

export function getPermissionStatus(): NotificationPermission {
  if (!('Notification' in window)) {
    return 'denied';
  }
  return Notification.permission;
}

export async function notifyExpiringItems(
  batches: Batch[],
  alertWindowDays: number
): Promise<void> {
  if (!('Notification' in window) || Notification.permission !== 'granted') {
    return;
  }

  const expiring = batches.filter((batch) => {
    const status = calculateExpiryStatus(batch.expiryDate, alertWindowDays);
    return status === 'expiring' || status === 'expired';
  });

  if (expiring.length === 0) return;

  for (const batch of expiring.slice(0, 3)) {
    const product = await getProduct(batch.barcode);
    const status = calculateExpiryStatus(batch.expiryDate, alertWindowDays);
    const days = getDaysUntilExpiry(batch.expiryDate);
    const title = status === 'expired' ? 'Item Expired' : 'Item Expiring Soon';
    const body = `${product?.name ?? 'Product'} (${batch.barcode}) — ${
      days < 0 ? `expired ${Math.abs(days)} day${Math.abs(days) !== 1 ? 's' : ''} ago` : `expires in ${days} day${days !== 1 ? 's' : ''}`
    }`;

    new Notification(title, {
      body,
      tag: `expiry-${batch.batchId}`,
    });
  }
}

export async function checkExpiryAlerts(settings: Settings): Promise<NotificationItem[]> {
  const batches = await getExpiringBatches(settings.alertWindowDays);
  const alerts: NotificationItem[] = [];

  for (const batch of batches) {
    const status = calculateExpiryStatus(batch.expiryDate, settings.alertWindowDays);
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
