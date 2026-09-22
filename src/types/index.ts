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
  id: 'settings';
  alertWindowDays: number;
  notificationsEnabled: boolean;
  theme: 'auto' | 'light' | 'dark';
}

export const DEFAULT_SETTINGS: Settings = {
  id: 'settings',
  alertWindowDays: 3,
  notificationsEnabled: false,
  theme: 'auto',
};

export interface NotificationItem {
  batchId: string;
  barcode: string;
  productName: string;
  expiryDate: string;
  daysUntilExpiry: number;
  read: boolean;
}

export type ExpiryStatus = 'good' | 'expiring' | 'expired';

export interface InventoryGroup {
  product: Product;
  batches: Batch[];
  totalQuantity: number;
  earliestExpiry: string;
}
