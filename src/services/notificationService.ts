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
  // Use local date extraction for both dates to avoid timezone issues
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  // Parse YYYY-MM-DD as local (not UTC midnight)
  const datePart = expiryDate.split('T')[0];
  if (!datePart) return 0;
  const parts = datePart.split('-');
  if (parts.length < 3) return 0;
  const year = parseInt(parts[0] ?? '0', 10);
  const month = parseInt(parts[1] ?? '0', 10) - 1;
  const day = parseInt(parts[2] ?? '0', 10);
  // Validate parsed parts — malformed input returns 0 instead of NaN
  if (
    !Number.isFinite(year) ||
    !Number.isFinite(month) ||
    !Number.isFinite(day) ||
    month < 0 || month > 11 ||
    day < 1 || day > 31
  ) {
    return 0;
  }
  const expiry = new Date(year, month, day);
  // Final safety check — if Date construction rolled over (e.g. Feb 30), invalid
  if (expiry.getMonth() !== month || expiry.getDate() !== day) return 0;

  return Math.round((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
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
