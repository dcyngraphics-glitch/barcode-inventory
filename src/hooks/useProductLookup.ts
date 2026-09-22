import { useCallback, useEffect, useRef, useState } from 'react';
import type { Product, ProductSource } from '@/types';
import { lookupProduct, LookupError } from '@/services/productLookupService';

export interface UseProductLookupResult {
  product: Product | null;
  source: ProductSource | null;
  loading: boolean;
  error: string | null;
  lookup: (barcode: string) => Promise<void>;
}

export function useProductLookup(): UseProductLookupResult {
  const [product, setProduct] = useState<Product | null>(null);
  const [source, setSource] = useState<ProductSource | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Bug fix #2: Track mounted state to prevent stale setState on unmounted component
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const lookup = useCallback(async (barcode: string) => {
    setLoading(true);
    setError(null);
    setProduct(null);
    setSource(null);

    try {
      const result = await lookupProduct(barcode);
      // Bug fix #2: Check isMounted before setState to avoid race condition
      if (!isMountedRef.current) return;

      if (result.source === 'manual') {
        // Manual entry: discard the placeholder, prompt the user
        setProduct(null);
        setSource('manual');
      } else {
        setProduct(result.product);
        setSource(result.source);
      }
    } catch (err) {
      // Bug fix #2: Check isMounted before setState
      if (!isMountedRef.current) return;

      if (err instanceof LookupError) {
        setError(err.message);
      } else {
        setError(err instanceof Error ? err.message : 'Lookup failed');
      }
      setProduct(null);
      setSource(null);
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, []);

  return { product, source, loading, error, lookup };
}
