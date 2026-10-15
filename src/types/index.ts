export const SETTINGS_ID = 'settings';

export type ProductSource = 'local' | 'openfoodfacts' | 'manual';

export interface Product {
  barcode: string;
  name: string;
  brand: string;
  category: string;
  storePrice: number;
  defaultExpiry: string;
  imageUrl?: string;
  source: ProductSource;
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
  id: typeof SETTINGS_ID;
  alertWindowDays: number;
  notificationsEnabled: boolean;
  theme: 'auto' | 'light' | 'dark';
  catalogSeeded?: boolean;
  cashierMode: boolean;
  tutorialCompleted: boolean;
  tutorialStep: number;
  screenHintsSeen: string[];
}

export const DEFAULT_SETTINGS: Settings = {
  id: SETTINGS_ID,
  alertWindowDays: 3,
  notificationsEnabled: false,
  theme: 'auto',
  catalogSeeded: false,
  cashierMode: false,
  tutorialCompleted: false,
  tutorialStep: 0,
  screenHintsSeen: [],
};

export type ExpiryStatus = 'good' | 'expiring' | 'expired';

export interface InventoryGroup {
  product: Product;
  batches: Batch[];
  totalQuantity: number;
  earliestExpiry: string;
}

export interface SaleDeduction {
  batchId: string;
  quantity: number;
  expiryDate: string;   // snapshot so a deleted batch can be recreated on undo
  scannedAt: string;    // snapshot
}

export interface SaleLine {
  barcode: string;
  name: string;
  brand: string;
  unitPrice: number;    // snapshot — later price edits must not rewrite history
  quantity: number;
  lineTotal: number;
  deductions: SaleDeduction[];
  shortfall: number;    // units sold with no stock to deduct
}

export interface Sale {
  saleId: string;
  soldAt: string;
  dayKey: string;       // local 'YYYY-MM-DD'
  lines: SaleLine[];
  total: number;
  itemCount: number;
}
