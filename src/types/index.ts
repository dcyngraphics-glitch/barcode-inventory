export interface Product {
  barcode: string;
  name: string;
  brand: string;
  category: string;
  storePrice: number;
  defaultExpiry: string;
  imageUrl?: string;
  source: 'local' | 'openfoodfacts' | 'manual';
  createdAt: string;
  updatedAt: string;
}

export interface Batch {
  batchId: string;
  barcode: string;
  quantity: number;
  expiryDate: string;
  scannedAt: string;
  notes?: string;
}

export interface Settings {
  alertWindow: number;
  notificationsEnabled: boolean;
  currency: 'PHP' | 'USD' | 'EUR';
  theme: 'light' | 'dark' | 'system';
}

export const DEFAULT_SETTINGS: Settings = {
  alertWindow: 3,
  notificationsEnabled: false,
  currency: 'PHP',
  theme: 'system',
};

export interface NotificationItem {
  batchId: string;
  barcode: string;
  productName: string;
  expiryDate: string;
  daysUntilExpiry: number;
  read: boolean;
}

export type ExpiryStatus = 'expired' | 'expiring-soon' | 'good';
