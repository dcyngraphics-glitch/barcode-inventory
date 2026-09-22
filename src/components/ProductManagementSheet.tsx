import { useState } from 'react';
import { X, Trash2 } from 'lucide-react';
import type { Product } from '@/types';

interface ProductManagementSheetProps {
  open: boolean;
  product: Product | null;
  onClose: () => void;
  onSave: (product: Product) => Promise<void>;
  onDelete: (barcode: string) => Promise<void>;
}

export function ProductManagementSheet({
  open,
  product,
  onClose,
  onSave,
  onDelete,
}: ProductManagementSheetProps) {
  const [formData, setFormData] = useState<Product | null>(product);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Reset form when product changes
  if (open && product && formData?.barcode !== product.barcode) {
    setFormData(product);
    setError(null);
    setShowDeleteConfirm(false);
  }

  if (!open || !product || !formData) return null;

  const handleSave = async () => {
    if (!formData) return;
    setLoading(true);
    setError(null);
    try {
      await onSave(formData);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save product');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    setLoading(true);
    setError(null);
    try {
      await onDelete(product.barcode);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete product');
    } finally {
      setLoading(false);
    }
  };

  const updateField = (field: keyof Product, value: string | number) => {
    setFormData((prev) => (prev ? { ...prev, [field]: value } : null));
  };

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.4)',
          zIndex: 40,
          animation: 'fade-in 150ms ease',
        }}
      />

      {/* Bottom Sheet */}
      <div
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          background: '#FFFFFF',
          borderRadius: '16px 16px 0 0',
          padding: '24px',
          paddingBottom: 'calc(24px + env(safe-area-inset-bottom))',
          boxShadow: '0 -10px 15px rgba(0,0,0,0.1)',
          maxWidth: '500px',
          margin: '0 auto',
          zIndex: 50,
          animation: 'slide-up 200ms ease',
          maxHeight: '90vh',
          overflowY: 'auto',
        }}
      >
        {/* Drag handle */}
        <div
          style={{
            width: '40px',
            height: '4px',
            background: '#E6E8EA',
            borderRadius: '2px',
            margin: '0 auto 16px',
          }}
        />

        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '24px',
          }}
        >
          <h2
            style={{
              fontSize: '18px',
              fontWeight: 600,
              color: '#0F172A',
              margin: 0,
            }}
          >
            Edit Product
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#475569',
              cursor: 'pointer',
              padding: '8px',
              minWidth: '44px',
              minHeight: '44px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            aria-label="Close"
          >
            <X size={24} />
          </button>
        </div>

        {/* Form fields */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Product Name */}
          <div>
            <label
              htmlFor="edit-name"
              style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: 500,
                color: '#0F172A',
                marginBottom: '4px',
              }}
            >
              Product Name
            </label>
            <input
              id="edit-name"
              type="text"
              value={formData.name}
              onChange={(e) => updateField('name', e.target.value)}
              style={{
                padding: '12px 16px',
                border: '1px solid #E6E8EA',
                borderRadius: '8px',
                fontSize: '16px',
                fontFamily: 'Inter, sans-serif',
                background: '#FFFFFF',
                color: '#0F172A',
                width: '100%',
                boxSizing: 'border-box',
              }}
            />
          </div>

          {/* Brand */}
          <div>
            <label
              htmlFor="edit-brand"
              style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: 500,
                color: '#0F172A',
                marginBottom: '4px',
              }}
            >
              Brand
            </label>
            <input
              id="edit-brand"
              type="text"
              value={formData.brand}
              onChange={(e) => updateField('brand', e.target.value)}
              style={{
                padding: '12px 16px',
                border: '1px solid #E6E8EA',
                borderRadius: '8px',
                fontSize: '16px',
                fontFamily: 'Inter, sans-serif',
                background: '#FFFFFF',
                color: '#0F172A',
                width: '100%',
                boxSizing: 'border-box',
              }}
            />
          </div>

          {/* Category */}
          <div>
            <label
              htmlFor="edit-category"
              style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: 500,
                color: '#0F172A',
                marginBottom: '4px',
              }}
            >
              Category
            </label>
            <input
              id="edit-category"
              type="text"
              value={formData.category}
              onChange={(e) => updateField('category', e.target.value)}
              style={{
                padding: '12px 16px',
                border: '1px solid #E6E8EA',
                borderRadius: '8px',
                fontSize: '16px',
                fontFamily: 'Inter, sans-serif',
                background: '#FFFFFF',
                color: '#0F172A',
                width: '100%',
                boxSizing: 'border-box',
              }}
            />
          </div>

          {/* Default Price */}
          <div>
            <label
              htmlFor="edit-price"
              style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: 500,
                color: '#0F172A',
                marginBottom: '4px',
              }}
            >
              Default Price (₱)
            </label>
            <div style={{ position: 'relative' }}>
              <span
                style={{
                  position: 'absolute',
                  left: '16px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  fontSize: '16px',
                  color: '#475569',
                  pointerEvents: 'none',
                }}
              >
                ₱
              </span>
              <input
                id="edit-price"
                type="text"
                inputMode="decimal"
                value={formData.storePrice}
                onChange={(e) => updateField('storePrice', parseFloat(e.target.value) || 0)}
                style={{
                  padding: '12px 16px 12px 36px',
                  border: '1px solid #E6E8EA',
                  borderRadius: '8px',
                  fontSize: '16px',
                  fontFamily: 'Inter, sans-serif',
                  background: '#FFFFFF',
                  color: '#0F172A',
                  width: '100%',
                  boxSizing: 'border-box',
                }}
              />
            </div>
          </div>

          {/* Default Expiry */}
          <div>
            <label
              htmlFor="edit-expiry"
              style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: 500,
                color: '#0F172A',
                marginBottom: '4px',
              }}
            >
              Default Expiry
            </label>
            <input
              id="edit-expiry"
              type="date"
              value={formData.defaultExpiry}
              onChange={(e) => updateField('defaultExpiry', e.target.value)}
              style={{
                padding: '12px 16px',
                border: '1px solid #E6E8EA',
                borderRadius: '8px',
                fontSize: '16px',
                fontFamily: 'Inter, sans-serif',
                background: '#FFFFFF',
                color: '#0F172A',
                width: '100%',
                boxSizing: 'border-box',
              }}
            />
          </div>

          {/* Error message */}
          {error && (
            <div
              style={{
                padding: '12px 16px',
                background: '#FEE2E2',
                border: '1px solid #FECACA',
                borderRadius: '8px',
                fontSize: '14px',
                color: '#991B1B',
              }}
            >
              {error}
            </div>
          )}

          {/* Save Button */}
          <button
            onClick={handleSave}
            disabled={loading}
            style={{
              width: '100%',
              background: '#059669',
              color: '#FFFFFF',
              padding: '12px 24px',
              borderRadius: '8px',
              fontWeight: 600,
              fontSize: '16px',
              minHeight: '48px',
              border: 'none',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1,
              transition: 'opacity 200ms ease',
            }}
          >
            {loading ? 'Saving...' : 'Save Changes'}
          </button>

          {/* Delete Button */}
          {!showDeleteConfirm ? (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              style={{
                width: '100%',
                background: 'transparent',
                color: '#DC2626',
                padding: '12px 24px',
                borderRadius: '8px',
                fontWeight: 500,
                fontSize: '14px',
                minHeight: '44px',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                transition: 'all 200ms ease',
              }}
            >
              <Trash2 size={16} />
              Delete Product
            </button>
          ) : (
            <div
              style={{
                padding: '16px',
                background: '#FEE2E2',
                borderRadius: '8px',
                border: '1px solid #FECACA',
              }}
            >
              <p
                style={{
                  fontSize: '14px',
                  color: '#991B1B',
                  margin: '0 0 12px',
                }}
              >
                Delete this product and all its batches? This cannot be undone.
              </p>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  style={{
                    flex: 1,
                    background: '#FFFFFF',
                    color: '#334155',
                    padding: '8px 16px',
                    borderRadius: '8px',
                    fontWeight: 500,
                    fontSize: '14px',
                    minHeight: '44px',
                    border: '1px solid #E6E8EA',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  disabled={loading}
                  style={{
                    flex: 1,
                    background: '#DC2626',
                    color: '#FFFFFF',
                    padding: '8px 16px',
                    borderRadius: '8px',
                    fontWeight: 500,
                    fontSize: '14px',
                    minHeight: '44px',
                    border: 'none',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    opacity: loading ? 0.7 : 1,
                  }}
                >
                  {loading ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slide-up {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
      `}</style>
    </>
  );
}
