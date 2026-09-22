import { useState } from 'react';
import { Plus, Minus } from 'lucide-react';

export interface ProductFormData {
  name: string;
  brand: string;
  category: string;
  price: string;
  expiryDate: string;
  quantity: number;
}

interface ProductFormProps {
  initialData: ProductFormData;
  isNewProduct?: boolean;
  onSubmit: (data: ProductFormData) => void;
  loading: boolean;
  error: string | null;
}

export function ProductForm({
  initialData,
  isNewProduct: _isNewProduct,
  onSubmit,
  loading,
  error,
}: ProductFormProps) {
  const [formData, setFormData] = useState<ProductFormData>(initialData);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  const validate = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.name.trim()) {
      errors.name = 'Product name is required';
    }
    const priceNum = parseFloat(formData.price);
    if (!formData.price || isNaN(priceNum) || priceNum <= 0) {
      errors.price = 'Price must be greater than 0';
    }
    if (!formData.expiryDate) {
      errors.expiryDate = 'Expiry date is required';
    }
    if (formData.quantity < 1) {
      errors.quantity = 'Quantity must be at least 1';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      onSubmit(formData);
    }
  };

  const updateField = (field: keyof ProductFormData, value: string | number) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear validation error for this field
    if (validationErrors[field]) {
      setValidationErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const incrementQuantity = () => {
    updateField('quantity', formData.quantity + 1);
  };

  const decrementQuantity = () => {
    if (formData.quantity > 1) {
      updateField('quantity', formData.quantity - 1);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Product Name */}
      <div>
        <label
          htmlFor="product-name"
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
          id="product-name"
          type="text"
          value={formData.name}
          onChange={(e) => updateField('name', e.target.value)}
          placeholder="Enter product name"
          style={{
            padding: '12px 16px',
            border: `1px solid ${validationErrors.name ? '#DC2626' : '#E6E8EA'}`,
            borderRadius: '8px',
            fontSize: '16px',
            fontFamily: 'Inter, sans-serif',
            background: '#FFFFFF',
            color: '#0F172A',
            width: '100%',
            boxSizing: 'border-box',
            transition: 'border-color 200ms ease, box-shadow 200ms ease',
          }}
        />
        {validationErrors.name && (
          <span style={{ fontSize: '12px', color: '#DC2626', marginTop: '4px', display: 'block' }}>
            {validationErrors.name}
          </span>
        )}
      </div>

      {/* Brand */}
      <div>
        <label
          htmlFor="product-brand"
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
          id="product-brand"
          type="text"
          value={formData.brand}
          onChange={(e) => updateField('brand', e.target.value)}
          placeholder="Enter brand"
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
            transition: 'border-color 200ms ease, box-shadow 200ms ease',
          }}
        />
      </div>

      {/* Category */}
      <div>
        <label
          htmlFor="product-category"
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
          id="product-category"
          type="text"
          value={formData.category}
          onChange={(e) => updateField('category', e.target.value)}
          placeholder="Enter category"
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
            transition: 'border-color 200ms ease, box-shadow 200ms ease',
          }}
        />
      </div>

      {/* Price */}
      <div>
        <label
          htmlFor="product-price"
          style={{
            display: 'block',
            fontSize: '14px',
            fontWeight: 500,
            color: '#0F172A',
            marginBottom: '4px',
          }}
        >
          Price (₱)
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
            id="product-price"
            type="text"
            inputMode="decimal"
            value={formData.price}
            onChange={(e) => updateField('price', e.target.value)}
            placeholder="0.00"
            style={{
              padding: '12px 16px 12px 36px',
              border: `1px solid ${validationErrors.price ? '#DC2626' : '#E6E8EA'}`,
              borderRadius: '8px',
              fontSize: '16px',
              fontFamily: 'Inter, sans-serif',
              background: '#FFFFFF',
              color: '#0F172A',
              width: '100%',
              boxSizing: 'border-box',
              transition: 'border-color 200ms ease, box-shadow 200ms ease',
            }}
          />
        </div>
        {validationErrors.price && (
          <span style={{ fontSize: '12px', color: '#DC2626', marginTop: '4px', display: 'block' }}>
            {validationErrors.price}
          </span>
        )}
      </div>

      {/* Expiry Date */}
      <div>
        <label
          htmlFor="product-expiry"
          style={{
            display: 'block',
            fontSize: '14px',
            fontWeight: 500,
            color: '#0F172A',
            marginBottom: '4px',
          }}
        >
          Expiry Date
        </label>
        <input
          id="product-expiry"
          type="date"
          value={formData.expiryDate}
          onChange={(e) => updateField('expiryDate', e.target.value)}
          style={{
            padding: '12px 16px',
            border: `1px solid ${validationErrors.expiryDate ? '#DC2626' : '#E6E8EA'}`,
            borderRadius: '8px',
            fontSize: '16px',
            fontFamily: 'Inter, sans-serif',
            background: '#FFFFFF',
            color: '#0F172A',
            width: '100%',
            boxSizing: 'border-box',
            transition: 'border-color 200ms ease, box-shadow 200ms ease',
          }}
        />
        {validationErrors.expiryDate && (
          <span style={{ fontSize: '12px', color: '#DC2626', marginTop: '4px', display: 'block' }}>
            {validationErrors.expiryDate}
          </span>
        )}
      </div>

      {/* Quantity */}
      <div>
        <label
          htmlFor="product-quantity"
          style={{
            display: 'block',
            fontSize: '14px',
            fontWeight: 500,
            color: '#0F172A',
            marginBottom: '4px',
          }}
        >
          Quantity
        </label>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <button
            type="button"
            onClick={decrementQuantity}
            disabled={formData.quantity <= 1}
            style={{
              width: '44px',
              height: '44px',
              border: '1px solid #E6E8EA',
              borderRadius: '8px',
              background: '#FFFFFF',
              color: '#334155',
              fontSize: '20px',
              fontWeight: 600,
              cursor: formData.quantity <= 1 ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              opacity: formData.quantity <= 1 ? 0.5 : 1,
              transition: 'all 200ms ease',
            }}
            aria-label="Decrease quantity"
          >
            <Minus size={20} />
          </button>
          <input
            id="product-quantity"
            type="text"
            inputMode="numeric"
            value={formData.quantity}
            onChange={(e) => {
              const val = parseInt(e.target.value, 10);
              if (!isNaN(val) && val >= 1) {
                updateField('quantity', val);
              } else if (e.target.value === '') {
                updateField('quantity', 1);
              }
            }}
            style={{
              flex: 1,
              padding: '12px 16px',
              border: `1px solid ${validationErrors.quantity ? '#DC2626' : '#E6E8EA'}`,
              borderRadius: '8px',
              fontSize: '16px',
              fontFamily: 'Inter, sans-serif',
              background: '#FFFFFF',
              color: '#0F172A',
              textAlign: 'center',
              boxSizing: 'border-box',
              transition: 'border-color 200ms ease, box-shadow 200ms ease',
            }}
          />
          <button
            type="button"
            onClick={incrementQuantity}
            style={{
              width: '44px',
              height: '44px',
              border: '1px solid #E6E8EA',
              borderRadius: '8px',
              background: '#FFFFFF',
              color: '#334155',
              fontSize: '20px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 200ms ease',
            }}
            aria-label="Increase quantity"
          >
            <Plus size={20} />
          </button>
        </div>
        {validationErrors.quantity && (
          <span style={{ fontSize: '12px', color: '#DC2626', marginTop: '4px', display: 'block' }}>
            {validationErrors.quantity}
          </span>
        )}
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

      {/* Submit Button */}
      <button
        type="submit"
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
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
        }}
      >
        {loading ? (
          <>
            <span
              style={{
                width: '20px',
                height: '20px',
                border: '2px solid #FFFFFF',
                borderTopColor: 'transparent',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite',
              }}
            />
            Adding...
          </>
        ) : (
          'Add to Inventory'
        )}
      </button>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </form>
  );
}
