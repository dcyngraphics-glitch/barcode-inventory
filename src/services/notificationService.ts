import type { ExpiryStatus, Batch } from '@/types';
import { getProduct } from './catalogService';

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

function dateDiffDays(expiryDate: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = new Date(expiryDate);
  expiry.setHours(0, 0, 0, 0);
  return Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

export function calculateExpiryStatus(expiryDate: string, alertWindowDays: number): ExpiryStatus {
  const diffDays = dateDiffDays(expiryDate);
  if (diffDays < 0) return 'expired';
  if (diffDays <= alertWindowDays) return 'expiring';
  return 'good';
}

export function getDaysUntilExpiry(expiryDate: string): number {
  return dateDiffDays(expiryDate);
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
    try {
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
    } catch (err) {
      console.error(`notifyExpiringItems: failed to process batch ${batch.batchId}:`, err);
    }
  }
}
