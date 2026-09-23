import { useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShoppingCart, Trash2, Plus, Minus, ArrowLeft, Package, Loader2 } from 'lucide-react';
import { useScanCart } from '@/context/ScanCartContext';
import { saveProduct, updateProduct } from '@/services/catalogService';
import { addBatch } from '@/services/inventoryService';
import { generateId } from '@/utils/helpers';

export function CartReviewScreen() {
  const navigate = useNavigate();
  const { items, removeItem, updateItem, clearCart, totalPrice, totalItems } = useScanCart();
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const navigateTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
      if (navigateTimerRef.current) clearTimeout(navigateTimerRef.current);
    };
  }, []);

  const showToast = useCallback((message: string, type: 'success' | 'error') => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast({ message, type });
    toastTimerRef.current = setTimeout(() => {
      setToast(null);
      toastTimerRef.current = null;
    }, 3000);
  }, []);

  const handleAddAll = async () => {
    setSaving(true);
    try {
      const now = new Date().toISOString();

      for (const item of items) {
        // Save product to catalog if new (no existing product)
        if (!item.product) {
          await saveProduct({
            barcode: item.barcode,
            name: item.name || `Unknown (${item.barcode})`,
            brand: item.brand,
            category: '',
            storePrice: item.price,
            defaultExpiry: item.expiryDate,
            imageUrl: item.imageUrl,
            source: 'manual',
            createdAt: now,
            updatedAt: now,
          });
        } else {
          // Update product price if changed
          if (item.product.storePrice !== item.price) {
            await updateProduct({
              ...item.product,
              storePrice: item.price,
              updatedAt: now,
            });
          }
        }

        // Add batch
        await addBatch({
          batchId: generateId(),
          barcode: item.barcode,
          quantity: item.quantity,
          expiryDate: item.expiryDate,
          scannedAt: now,
        });
      }

      showToast(`Added ${totalItems} item${totalItems !== 1 ? 's' : ''} to inventory`, 'success');
      clearCart();
      if (navigateTimerRef.current) clearTimeout(navigateTimerRef.current);
      navigateTimerRef.current = setTimeout(() => {
        navigate('/inventory');
        navigateTimerRef.current = null;
      }, 800);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save items';
      showToast(message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleQuantityChange = (id: string, delta: number) => {
    const item = items.find((i) => i.id === id);
    if (!item) return;
    const newQty = item.quantity + delta;
    if (newQty < 1) {
      removeItem(id);
    } else {
      updateItem(id, { quantity: newQty });
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#f8fafc',
        display: 'flex',
        flexDirection: 'column',
        paddingBottom: '80px',
      }}
    >
      {/* Header */}
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
        <button
          onClick={() => navigate('/')}
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
          }}
          aria-label="Back to scanner"
        >
          <ArrowLeft size={24} />
        </button>
        <h1
          style={{
            fontSize: '18px',
            fontWeight: 600,
            color: '#f8fafc',
            margin: 0,
            flex: 1,
          }}
        >
          Review Cart
        </h1>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            color: '#f8fafc',
            fontSize: '14px',
            fontWeight: 500,
          }}
        >
          <ShoppingCart size={18} />
          <span>{totalItems}</span>
        </div>
      </header>

      {/* Items List */}
      <main style={{ flex: 1, padding: '16px' }}>
        {items.length === 0 ? (
          <div
            style={{
              textAlign: 'center',
              padding: '48px 16px',
              color: '#94a3b8',
            }}
          >
            <Package size={48} style={{ marginBottom: '16px', opacity: 0.4 }} />
            <p style={{ fontSize: '16px', margin: 0 }}>Cart is empty</p>
            <p style={{ fontSize: '14px', marginTop: '4px' }}>Scan items to add them here</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {items.map((item) => (
              <div
                key={item.id}
                style={{
                  background: '#fff',
                  borderRadius: '12px',
                  padding: '16px',
                  border: '1px solid #e2e8f0',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: '14px',
                      fontWeight: 600,
                      color: '#0f172a',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {item.name || `Unknown (${item.barcode})`}
                  </div>
                  {item.brand && (
                    <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                      {item.brand}
                    </div>
                  )}
                  <div
                    style={{
                      fontSize: '13px',
                      color: '#0f172a',
                      fontWeight: 600,
                      marginTop: '4px',
                    }}
                  >
                    ₱{item.price.toFixed(2)}
                    {item.expiryDate && (
                      <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 400, marginLeft: '8px' }}>
                        Exp: {new Date(item.expiryDate).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                    )}
                  </div>
                </div>

                {/* Quantity Controls */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    flexShrink: 0,
                  }}
                >
                  <button
                    onClick={() => handleQuantityChange(item.id, -1)}
                    aria-label="Decrease quantity"
                    style={{
                      width: '32px',
                      height: '32px',
                      border: '1px solid #e2e8f0',
                      borderRadius: '6px',
                      background: '#f8fafc',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#475569',
                    }}
                  >
                    <Minus size={14} />
                  </button>
                  <span
                    style={{
                      minWidth: '24px',
                      textAlign: 'center',
                      fontSize: '14px',
                      fontWeight: 600,
                      color: '#0f172a',
                    }}
                  >
                    {item.quantity}
                  </span>
                  <button
                    onClick={() => handleQuantityChange(item.id, 1)}
                    aria-label="Increase quantity"
                    style={{
                      width: '32px',
                      height: '32px',
                      border: '1px solid #e2e8f0',
                      borderRadius: '6px',
                      background: '#f8fafc',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#475569',
                    }}
                  >
                    <Plus size={14} />
                  </button>
                </div>

                {/* Remove Button */}
                <button
                  onClick={() => removeItem(item.id)}
                  aria-label="Remove item"
                  style={{
                    width: '32px',
                    height: '32px',
                    border: 'none',
                    borderRadius: '6px',
                    background: '#fef2f2',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#dc2626',
                    flexShrink: 0,
                  }}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}

            {/* Total */}
            <div
              style={{
                background: '#fff',
                borderRadius: '12px',
                padding: '16px',
                border: '1px solid #e2e8f0',
                marginTop: '8px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <span style={{ fontSize: '16px', fontWeight: 600, color: '#0f172a' }}>Total</span>
              <span style={{ fontSize: '20px', fontWeight: 700, color: '#0f172a' }}>
                ₱{totalPrice.toFixed(2)}
              </span>
            </div>
          </div>
        )}
      </main>

      {/* Add All Button */}
      {items.length > 0 && (
        <div
          style={{
            padding: '16px',
            background: '#fff',
            borderTop: '1px solid #e2e8f0',
            position: 'sticky',
            bottom: '56px',
          }}
        >
          <button
            onClick={handleAddAll}
            disabled={saving}
            style={{
              width: '100%',
              padding: '16px',
              background: saving ? '#64748b' : '#0f172a',
              border: 'none',
              borderRadius: '12px',
              color: '#fff',
              fontSize: '16px',
              fontWeight: 600,
              cursor: saving ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              minHeight: '52px',
            }}
          >
            {saving ? (
              <>
                <Loader2 size={18} className="spin" />
                Saving...
              </>
            ) : (
              <>
                <ShoppingCart size={18} />
                Add All to Inventory ({totalItems} item{totalItems !== 1 ? 's' : ''})
              </>
            )}
          </button>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div
          style={{
            position: 'fixed',
            bottom: '140px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: '#0f172a',
            color: '#fff',
            padding: '12px 24px',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: 500,
            zIndex: 60,
            animation: 'fade-in 200ms ease',
          }}
          role="status"
        >
          {toast.message}
        </div>
      )}

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
