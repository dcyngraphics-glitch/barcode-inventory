import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Pencil, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';
import { ProductImage } from '@/components/ProductImage';
import { ProductForm, type ProductFormData } from '@/components/ProductForm';
import { ProductManagementSheet } from '@/components/ProductManagementSheet';
import { useProductLookup } from '@/hooks/useProductLookup';
import { saveProduct, updateProduct, deleteProduct } from '@/services/catalogService';
import { buildProductUpdate } from '@/utils/productUpdate';
import { db } from '@/db/database';
import { generateId } from '@/utils/helpers';
import type { Product, ProductDraft, Batch } from '@/types';

const BOTTOM_NAV_HEIGHT = 80;

export function ProductDetailScreen() {
  const { barcode } = useParams<{ barcode: string }>();
  const navigate = useNavigate();
  const { product: lookedUpProduct, source: lookupSource, loading: lookupLoading, error: lookupError, lookup } = useProductLookup();

  const [product, setProduct] = useState<Product | null>(null);
  const [isNewProduct, setIsNewProduct] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [editSheetOpen, setEditSheetOpen] = useState(false);

  // Store timer IDs in refs for cleanup
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const navigateTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Bug fix #6: Guard against double-submit navigate race
  const isSubmittingRef = useRef(false);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
      if (navigateTimerRef.current) clearTimeout(navigateTimerRef.current);
    };
  }, []);

  // Bug fix #4: Removed redundant getProduct call — the lookup service handles local catalog check
  // Initial lookup on mount
  useEffect(() => {
    if (!barcode) return;

    const barcodeStr = barcode;
    async function performLookup() {
      // Fix: Validate barcode format — supports EAN-13, EAN-8, UPC-A, UPC-E, Code 128, Code 39
      if (!/^[0-9A-Za-z\-.\s/]{1,48}$/.test(barcodeStr)) {
        setError('Invalid barcode: must be 1-48 alphanumeric characters');
        return;
      }

      setLoading(true);
      setError(null);

      try {
        await lookup(barcode!);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Lookup failed');
      } finally {
        setLoading(false);
      }
    }

    performLookup();
  }, [barcode, lookup]);

  // Handle lookup result
  // Fix: A product with source 'manual' that exists in catalog should NOT be treated as new.
  // isNewProduct = true only when no product was found at all.
  useEffect(() => {
    if (lookedUpProduct) {
      setProduct(lookedUpProduct);
      // Product exists in catalog or API → not new, even if source is 'manual'
      setIsNewProduct(false);
    } else if (lookupSource === 'manual') {
      // No product found anywhere — show empty form for manual entry
      setProduct(null);
      setIsNewProduct(true);
    } else if (lookupError && !lookupLoading) {
      // API failure — show empty form with retry option
      setProduct(null);
      setIsNewProduct(true);
    }
  }, [lookedUpProduct, lookupSource, lookupError, lookupLoading]);

  // Surface lookup errors (network, HTTP, parse)
  useEffect(() => {
    if (lookupError) {
      setError(lookupError);
    }
  }, [lookupError]);

  // Bug fix #3: Retry handler
  const handleRetry = useCallback(async () => {
    if (!barcode) return;
    setError(null);
    setLoading(true);
    try {
      await lookup(barcode);
    } catch {
      // error is set by the hook
    } finally {
      setLoading(false);
    }
  }, [barcode, lookup]);

  const getInitialFormData = useCallback((): ProductFormData => {
    if (!product) {
      return {
        name: '',
        brand: '',
        price: '',
        expiryDate: '',
        quantity: 1,
      };
    }

    return {
      name: product.name,
      brand: product.brand,
      price: product.storePrice > 0 ? product.storePrice.toString() : '',
      expiryDate: product.defaultExpiry || '',
      quantity: 1,
    };
  }, [product]);

  // Derived, not stored. ProductForm remounts via `key` when the barcode changes,
  // so it must get values computed from the *current* product in that same render.
  // Keeping them in state made the remount read the stale (empty) values, because
  // the lookup resolves after the form has already mounted — leaving an existing
  // product's name/brand/price blank and blocking "Update Inventory".
  const initialFormData = getInitialFormData();

  const showToast = (message: string, type: 'success' | 'error') => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast({ message, type });
    toastTimerRef.current = setTimeout(() => setToast(null), 3000);
  };

  const handleSubmit = async (data: ProductFormData) => {
    if (!barcode) return;

    // Fix: Defensive guards (last-resort if ProductForm validation is bypassed)
    const priceNum = parseFloat(data.price);
    if (isNaN(priceNum) || priceNum <= 0) {
      setError('Price must be greater than 0');
      return;
    }
    if (!data.name.trim()) {
      setError('Product name is required');
      return;
    }
    if (data.quantity < 1) {
      setError('Quantity must be at least 1');
      return;
    }

    // Bug fix #1: Guard — if product is null AND lookupSource is null (error state),
    // show error and prevent submit to avoid orphaned batch
    if (!product && !lookupSource && lookupError) {
      setError('Cannot save: lookup failed. Please retry or switch to manual entry.');
      return;
    }

    // Bug fix #6: Prevent double-submit
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;

    setLoading(true);
    setError(null);

    try {
      const now = new Date().toISOString();
      const price = parseFloat(data.price);
      // saveProduct returns the row it actually wrote, including the derived key.
      let savedProduct: Product | null = null;

      if (isNewProduct) {
        // Create new product and batch atomically in a single transaction
        const newProduct: ProductDraft = {
          barcode,
          name: data.name.trim(),
          brand: data.brand.trim(),
          category: 'uncategorized',
          storePrice: price,
          defaultExpiry: data.expiryDate,
          imageUrl: product?.imageUrl,
          source: product?.source || 'manual',
          createdAt: now,
          updatedAt: now,
        };
        const newBatch: Batch = {
          batchId: generateId(),
          barcode,
          quantity: data.quantity,
          expiryDate: data.expiryDate,
          scannedAt: now,
        };
        savedProduct = await db.transaction('rw', [db.products, db.inventory], async () => {
          // saveProduct derives the '#'-private primary key. Writing to db.products
          // directly would omit it and throw a ConstraintError at runtime.
          const written = await saveProduct(newProduct);
          await db.inventory.put(newBatch);
          return written;
        });
      } else {
        if (product) {
          // Persistence is unconditional: name and brand are always written when
          // they differ. This used to be gated behind a "seller mode" flag, which
          // silently discarded name/brand edits (and wrote nothing at all when only
          // the name changed). See src/utils/productUpdate.ts.
          const update = buildProductUpdate(
            product,
            { name: data.name, brand: data.brand, price, expiryDate: data.expiryDate },
            now,
          );
          const newBatch: Batch = {
            batchId: generateId(), barcode, quantity: data.quantity,
            expiryDate: data.expiryDate, scannedAt: now,
          };
          await db.transaction('rw', [db.products, db.inventory], async () => {
            if (update) {
              await saveProduct(update);
            }
            await db.inventory.put(newBatch);
          });
        }
      }

      if (isNewProduct) {
        showToast(`Product saved! Next time you scan ${barcode}, it'll show automatically.`, 'success');
        // Reflect the row that was actually written, including its derived key, so the
        // form doesn't reset and local state stays consistent with the database.
        setProduct(savedProduct);
        setIsNewProduct(false);
      } else {
        showToast('Added!', 'success');
      }
      // Bug fix #6: Clear any existing navigate timer before setting a new one
      if (navigateTimerRef.current) clearTimeout(navigateTimerRef.current);
      navigateTimerRef.current = setTimeout(() => navigate('/inventory'), 1500);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to add to inventory';
      setError(message);
      showToast(message, 'error');
    } finally {
      setLoading(false);
      isSubmittingRef.current = false;
    }
  };

  const handleEditSave = async (updatedProduct: Product) => {
    try {
      await updateProduct(updatedProduct);
      setProduct(updatedProduct);
      showToast('Product updated', 'success');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update product';
      console.error('handleEditSave error:', err);
      showToast(message, 'error');
    }
  };

  const handleEditDelete = async (barcodeToDelete: string) => {
    try {
      // Atomically delete product and all its batches in a single transaction
      await db.transaction('rw', [db.products, db.inventory], async () => {
        await db.inventory.where('barcode').equals(barcodeToDelete).delete();
        // Delete by barcode, not by primary key: the key is '#' + barcode, so passing
        // the bare barcode here would match nothing and silently leave the row.
        await deleteProduct(barcodeToDelete);
      });
      showToast('Product deleted', 'success');
      navigate('/inventory');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete product';
      console.error('handleEditDelete error:', err);
      showToast(message, 'error');
    }
  };

  if (!barcode) {
      return (
        <div className="empty-state">
          <p className="empty-state-message">No barcode provided</p>
        </div>
      );
    }

    if (lookupLoading && !product) {
      return (
        <div className="loading-screen">
          <header className="app-bar">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ArrowLeft size={24} color="var(--color-on-primary)" />
              <h1 className="app-bar-title">Product Details</h1>
            </div>
          </header>
          <main className="loading-content">
            <div className="loading-spinner" />
            <p className="text-muted">Looking up product...</p>
          </main>
          <style>{`
            @keyframes spin {
              to { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      );
    }

  // Bug fix #3: Show retry option when lookup has failed
  const showRetryOption = lookupError && !product && isNewProduct;

  return (
      <div className="screen-container">
        {/* Top App Bar */}
        <header className="app-bar">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              onClick={() => navigate(-1)}
              className="app-bar-action"
              aria-label="Go back"
            >
              <ArrowLeft size={24} />
            </button>
            <h1 className="app-bar-title">
              Product Details
            </h1>
          </div>
        </header>

        {/* Main content */}
        <main className="main-content">
        {/* Product Hero */}
                <div className="card">
                  <ProductImage imageUrl={product?.imageUrl} name={product?.name || 'Product'} />

                  {product?.name && (
                    <>
                      <h2 className="product-hero-name">
                        {product.name}
                      </h2>
                      {(product.brand || product.category) && (
                        <p className="product-hero-meta">
                          {[product.brand].filter(Boolean).join(' · ')}
                        </p>
                      )}
                    </>
                  )}

                  {/* Status Badge */}
                  <div className="status-badge-container">
                    {isNewProduct ? (
                      <span className="badge-good">
                        New Product
                      </span>
                    ) : (
                      <span className="badge-neutral">
                        In Catalog
                      </span>
                    )}
                  </div>

                  {/* Barcode display */}
                  <p className="text-muted font-mono text-xs barcode-display">
                    {barcode}
                  </p>
                </div>

                {/* Bug fix #3: Retry lookup button shown when API failure */}
                {showRetryOption && (
                  <button
                    onClick={handleRetry}
                    disabled={lookupLoading}
                    className="btn-secondary"
                    style={{ opacity: lookupLoading ? 0.6 : 1, transition: 'opacity 200ms ease' }}
                  >
                    <RefreshCw size={16} className={lookupLoading ? 'spin' : ''} />
                    {lookupLoading ? 'Retrying...' : 'Retry lookup'}
                  </button>
                )}

                {/* Editable Form */}
                <div className="card form-card">
                  <ProductForm
                    key={product?.barcode || 'new'}
                    initialData={initialFormData}
                    isNewProduct={isNewProduct}
                    onSubmit={handleSubmit}
                    loading={loading}
                    error={error}
                  />
                </div>

                {/* Edit product details link */}
                {!isNewProduct && product && (
                  <button
                    onClick={() => setEditSheetOpen(true)}
                    className="btn-ghost"
                  >
                    <Pencil size={16} />
                    Edit product details
                  </button>
                )}
              </main>

              {/* Toast */}
              {toast && (
                <div className="toast toast-visible" role="status" aria-live="polite">
                  {toast.type === 'success' ? (
                    <CheckCircle size={16} color="var(--color-good)" />
                  ) : (
                    <AlertCircle size={16} color="var(--color-destructive)" />
                  )}
                  {toast.message}
                </div>
              )}

              {/* Product Management Bottom Sheet */}
              <ProductManagementSheet
                open={editSheetOpen}
                product={product}
                onClose={() => setEditSheetOpen(false)}
                onSave={handleEditSave}
                onDelete={handleEditDelete}
              />

              <style>{`
                @keyframes fade-in {
                  from { opacity: 0; transform: translateX(-50%) translateY(10px); }
                  to { opacity: 1; transform: translateX(-50%) translateY(0); }
                }
                @keyframes spin {
                  to { transform: rotate(360deg); }
                }
                .spin {
                  animation: spin 1s linear infinite;
                }
              `}</style>
            </div>
          );
}
