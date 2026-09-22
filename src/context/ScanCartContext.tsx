import { createContext, useContext, useState, useCallback, useMemo } from 'react';
import type { Product } from '@/types';

export interface ScanCartItem {
  id: string;
  barcode: string;
  product: Product | null;
  name: string;
  brand: string;
  price: number;
  expiryDate: string;
  quantity: number;
  needsInfo: boolean;
  imageUrl?: string;
  source: 'local' | 'openfoodfacts' | 'manual';
}

interface ScanCartContextValue {
  items: ScanCartItem[];
  addItem: (item: Omit<ScanCartItem, 'id'>) => void;
  removeItem: (id: string) => void;
  updateItem: (id: string, patch: Partial<ScanCartItem>) => void;
  clearCart: () => void;
  totalPrice: number;
  totalItems: number;
}

const ScanCartContext = createContext<ScanCartContextValue | null>(null);

let cartIdCounter = 0;
function generateCartId(): string {
  cartIdCounter += 1;
  return `cart-${Date.now()}-${cartIdCounter}`;
}

export function ScanCartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ScanCartItem[]>([]);

  const addItem = useCallback((item: Omit<ScanCartItem, 'id'>) => {
    const newItem: ScanCartItem = { ...item, id: generateCartId() };

    setItems((prev) => {
      // If item has a barcode matching an existing item with same expiry, increment quantity
      const existingIdx = prev.findIndex(
        (p) => p.barcode === newItem.barcode && p.expiryDate === newItem.expiryDate && !p.needsInfo && !newItem.needsInfo
      );
      if (existingIdx >= 0) {
        const updated = [...prev];
        updated[existingIdx] = {
          ...updated[existingIdx]!,
          quantity: updated[existingIdx]!.quantity + newItem.quantity,
        };
        return updated;
      }
      return [...prev, newItem];
    });
  }, []);

  const removeItem = useCallback((id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const updateItem = useCallback((id: string, patch: Partial<ScanCartItem>) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...patch } : item))
    );
  }, []);

  const clearCart = useCallback(() => {
    setItems([]);
  }, []);

  const totalPrice = useMemo(
    () => items.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [items]
  );

  const totalItems = useMemo(
    () => items.reduce((sum, item) => sum + item.quantity, 0),
    [items]
  );

  const value: ScanCartContextValue = {
    items,
    addItem,
    removeItem,
    updateItem,
    clearCart,
    totalPrice,
    totalItems,
  };

  return (
    <ScanCartContext.Provider value={value}>
      {children}
    </ScanCartContext.Provider>
  );
}

export function useScanCart(): ScanCartContextValue {
  const ctx = useContext(ScanCartContext);
  if (!ctx) throw new Error('useScanCart must be used within ScanCartProvider');
  return ctx;
}
