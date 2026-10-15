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

  // Bug fix #3: Track request IDs to prevent race conditions from rapid scans
  const requestIdRef = useRef(0);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const lookup = useCallback(async (barcode: string) => {
    // Bug fix #3: Capture request ID to discard stale responses
    const currentId = ++requestIdRef.current;

    setLoading(true);
    setError(null);
    setProduct(null);
    setSource(null);

    try {
      const result = await lookupProduct(barcode);

      // Bug fix #3: Only apply result if this is still the latest request
      if (currentId !== requestIdRef.current) return;

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
      // Bug fix #3: Discard error if a newer request has been made
      if (currentId !== requestIdRef.current) return;

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
      // Bug fix #3: Only clear loading if this is still the latest request
      if (currentId === requestIdRef.current && isMountedRef.current) {
        setLoading(false);
      }
    }
  }, []);

  return { product, source, loading, error, lookup };
}
