import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Pencil, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';
import { ProductImage } from '@/components/ProductImage';
import { ProductForm, type ProductFormData } from '@/components/ProductForm';
import { ProductManagementSheet } from '@/components/ProductManagementSheet';
import { useProductLookup } from '@/hooks/useProductLookup';
import { saveProduct, updateProduct, deleteProduct } from '@/services/catalogService';
import { addBatch, getBatchesByBarcode, deleteBatch } from '@/services/inventoryService';
import { generateId } from '@/utils/helpers';
import { useSettingsContext } from '@/context/SettingsContext';
import type { Product } from '@/types';

const BOTTOM_NAV_HEIGHT = 80;

export function ProductDetailScreen() {
  const { barcode } = useParams<{ barcode: string }>();
  const navigate = useNavigate();
  const { product: lookedUpProduct, source: lookupSource, loading: lookupLoading, error: lookupError, lookup } = useProductLookup();
  const { settings: contextSettings } = useSettingsContext();
  const sellerMode = contextSettings?.sellerMode ?? false;

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
      // Fix: Validate barcode format (minimum 8 digits)
      if (!/^\d{8,}$/.test(barcodeStr)) {
        setError('Invalid barcode: must be at least 8 digits');
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
        category: '',
        price: '',
        expiryDate: '',
        quantity: 1,
      };
    }

    return {
      name: product.name,
      brand: product.brand,
      category: product.category,
      price: product.storePrice > 0 ? product.storePrice.toString() : '',
      expiryDate: product.defaultExpiry || '',
      quantity: 1,
    };
  }, [product]);

  const [formData, setFormData] = useState<ProductFormData>(getInitialFormData());

  // Update form data when product changes
  useEffect(() => {
    if (product) {
      setFormData(getInitialFormData());
    }
  }, [product, getInitialFormData]);

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

      if (isNewProduct) {
        // Create new product
        const newProduct: Product = {
          barcode,
          name: data.name.trim(),
          brand: data.brand.trim(),
          category: data.category.trim(),
          storePrice: price,
          defaultExpiry: data.expiryDate,
          imageUrl: product?.imageUrl,
          source: product?.source || 'manual',
          createdAt: now,
          updatedAt: now,
        };
        await saveProduct(newProduct);

        // Create new batch
        await addBatch({
          batchId: generateId(),
          barcode,
          quantity: data.quantity,
          expiryDate: data.expiryDate,
          scannedAt: now,
        });
      } else {
        // Seller Mode: update ALL fields if changed
        // Default Mode: update only price if changed
        if (product) {
          const needsUpdate = sellerMode
            ? (product.name !== data.name.trim() ||
               product.brand !== data.brand.trim() ||
               product.category !== data.category.trim() ||
               product.storePrice !== price ||
               product.defaultExpiry !== data.expiryDate)
            : (product.storePrice !== price);

          if (needsUpdate) {
            await updateProduct(sellerMode
              ? {
                  ...product,
                  name: data.name.trim(),
                  brand: data.brand.trim(),
                  category: data.category.trim(),
                  storePrice: price,
                  defaultExpiry: data.expiryDate,
                  updatedAt: now,
                }
              : {
                  ...product,
                  storePrice: price,
                  updatedAt: now,
                }
            );
          }
        }

        // Create new batch
        await addBatch({
          batchId: generateId(),
          barcode,
          quantity: data.quantity,
          expiryDate: data.expiryDate,
          scannedAt: now,
        });
      }

      if (isNewProduct) {
        showToast(`Product saved! Next time you scan ${barcode}, it'll show automatically.`, 'success');
      } else if (sellerMode) {
        showToast('Product info updated!', 'success');
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
    await updateProduct(updatedProduct);
    setProduct(updatedProduct);
    showToast('Product updated', 'success');
  };

  const handleEditDelete = async (barcodeToDelete: string) => {
    // Delete product and all its batches
    const batches = await getBatchesByBarcode(barcodeToDelete);
    for (const batch of batches) {
      await deleteBatch(batch.batchId);
    }
    await deleteProduct(barcodeToDelete);
    showToast('Product deleted', 'success');
    navigate('/inventory');
  };

  if (!barcode) {
    return (
      <div style={{ padding: '1rem', textAlign: 'center', color: '#94a3b8' }}>
        No barcode provided
      </div>
    );
  }

  if (lookupLoading && !product) {
    return (
      <div
        style={{
          minHeight: '100vh',
          background: '#F8FAFC',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <header
          style={{
            height: '56px',
            background: '#334155',
            display: 'flex',
            alignItems: 'center',
            padding: '0 16px',
            position: 'sticky',
            top: 0,
            zIndex: 30,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ArrowLeft size={24} color="#f8fafc" />
            <h1
              style={{
                fontSize: '18px',
                fontWeight: 600,
                color: '#f8fafc',
                margin: 0,
              }}
            >
              Product Details
            </h1>
          </div>
        </header>
        <main
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
          }}
        >
          <div style={{ textAlign: 'center', color: '#94a3b8' }}>
            <div
              style={{
                width: '48px',
                height: '48px',
                border: '3px solid #E6E8EA',
                borderTopColor: '#334155',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite',
                margin: '0 auto 16px',
              }}
            />
            <p>Looking up product...</p>
          </div>
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
    <div
      style={{
        minHeight: '100vh',
        background: '#F8FAFC',
        display: 'flex',
        flexDirection: 'column',
        paddingBottom: `${BOTTOM_NAV_HEIGHT}px`,
      }}
    >
      {/* Top App Bar */}
      <header
        style={{
          height: '56px',
          background: '#334155',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 16px',
          position: 'sticky',
          top: 0,
          zIndex: 30,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={() => navigate(-1)}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#f8fafc',
              cursor: 'pointer',
              padding: '8px',
              minWidth: '44px',
              minHeight: '44px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            aria-label="Go back"
          >
            <ArrowLeft size={24} />
          </button>
          <h1
            style={{
              fontSize: '18px',
              fontWeight: 600,
              color: '#f8fafc',
              margin: 0,
            }}
          >
            Product Details
          </h1>
        </div>
      </header>

      {/* Main content */}
      <main
        style={{
          flex: 1,
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
        }}
      >
        {/* Product Hero */}
        <div
          style={{
            background: '#FFFFFF',
            borderRadius: '12px',
            padding: '24px 16px',
            border: '1px solid #E6E8EA',
            textAlign: 'center',
          }}
        >
          <ProductImage imageUrl={product?.imageUrl} name={product?.name || 'Product'} />

          {product?.name && (
            <>
              <h2
                style={{
                  fontSize: '20px',
                  fontWeight: 600,
                  color: '#0F172A',
                  margin: '16px 0 4px',
                }}
              >
                {product.name}
              </h2>
              {(product.brand || product.category) && (
                <p
                  style={{
                    fontSize: '14px',
                    color: '#475569',
                    margin: 0,
                  }}
                >
                  {[product.brand, product.category].filter(Boolean).join(' · ')}
                </p>
              )}
            </>
          )}

          {/* Status Badge */}
          <div style={{ marginTop: '16px' }}>
            {isNewProduct ? (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '4px 12px',
                  borderRadius: '999px',
                  fontSize: '12px',
                  fontWeight: 500,
                  background: '#DCFCE7',
                  color: '#166534',
                }}
              >
                New Product
              </span>
            ) : (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '4px 12px',
                  borderRadius: '999px',
                  fontSize: '12px',
                  fontWeight: 500,
                  background: '#F2F3F4',
                  color: '#475569',
                }}
              >
                In Catalog
              </span>
            )}
          </div>

          {/* Barcode display */}
          <p
            style={{
              fontSize: '12px',
              color: '#94a3b8',
              marginTop: '12px',
              fontFamily: 'monospace',
            }}
          >
            {barcode}
          </p>
        </div>

        {/* Bug fix #3: Retry lookup button shown when API failure */}
        {showRetryOption && (
          <button
            onClick={handleRetry}
            disabled={lookupLoading}
            style={{
              background: '#FFFFFF',
              border: '1px solid #E6E8EA',
              borderRadius: '12px',
              padding: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              cursor: lookupLoading ? 'not-allowed' : 'pointer',
              color: '#334155',
              fontSize: '14px',
              fontWeight: 500,
              opacity: lookupLoading ? 0.6 : 1,
              transition: 'opacity 200ms ease',
            }}
          >
            <RefreshCw size={16} className={lookupLoading ? 'spin' : ''} />
            {lookupLoading ? 'Retrying...' : 'Retry lookup'}
          </button>
        )}

        {/* Editable Form */}
        <div
          style={{
            background: '#FFFFFF',
            borderRadius: '12px',
            padding: '16px',
            border: '1px solid #E6E8EA',
          }}
        >
          <ProductForm
            initialData={formData}
            isNewProduct={isNewProduct}
            sellerMode={sellerMode}
            onSubmit={handleSubmit}
            loading={loading}
            error={error}
          />
        </div>

        {/* Edit product details link */}
        {!isNewProduct && product && (
          <button
            onClick={() => setEditSheetOpen(true)}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#334155',
              fontSize: '14px',
              fontWeight: 500,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              padding: '8px',
              minHeight: '44px',
              margin: '0 auto',
              transition: 'opacity 200ms ease',
            }}
          >
            <Pencil size={16} />
            Edit product details
          </button>
        )}
      </main>

      {/* Toast */}
      {toast && (
        <div
          style={{
            position: 'fixed',
            bottom: '72px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: '#0F172A',
            color: '#FFFFFF',
            padding: '12px 24px',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: 500,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            zIndex: 60,
            animation: 'fade-in 200ms ease',
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
          }}
          role="status"
          aria-live="polite"
        >
          {toast.type === 'success' ? (
            <CheckCircle size={16} color="#16A34A" />
          ) : (
            <AlertCircle size={16} color="#DC2626" />
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
          from { opacity: 0; }
          to { opacity: 1; }
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
