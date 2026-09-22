import { useState, useRef } from 'react';
import { Plus, Minus } from 'lucide-react';
import { FormField } from './FormField';

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
  onSubmit: (data: ProductFormData) => void;
  loading: boolean;
  error: string | null;
  isNewProduct: boolean;
}

const inputStyle: React.CSSProperties = {
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
};

export function ProductForm({
  initialData,
  onSubmit,
  loading,
  error,
  isNewProduct,
}: ProductFormProps) {
  const [formData, setFormData] = useState<ProductFormData>(initialData);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const fieldRefs = useRef<Record<string, HTMLInputElement | null>>({});

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

    // Focus first invalid field
    if (Object.keys(errors).length > 0) {
      const firstErrorField = Object.keys(errors)[0] as string;
      fieldRefs.current[firstErrorField]?.focus();
    }

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

  const getInputStyle = (field: string): React.CSSProperties => ({
    ...inputStyle,
    border: `1px solid ${validationErrors[field] ? '#DC2626' : '#E6E8EA'}`,
  });

  const getErrorId = (field: string) => `${field}-error`;

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Product Name */}
      <FormField id="product-name" label="Product Name" error={validationErrors.name}>
        <input
          id="product-name"
          ref={(el) => { fieldRefs.current.name = el; }}
          type="text"
          value={formData.name}
          onChange={(e) => updateField('name', e.target.value)}
          placeholder="Enter product name"
          style={getInputStyle('name')}
          aria-invalid={!!validationErrors.name}
          aria-describedby={validationErrors.name ? getErrorId('name') : undefined}
        />
      </FormField>

      {/* Brand */}
      <FormField id="product-brand" label="Brand">
        <input
          id="product-brand"
          type="text"
          value={formData.brand}
          onChange={(e) => updateField('brand', e.target.value)}
          placeholder="Enter brand"
          style={inputStyle}
        />
      </FormField>

      {/* Category */}
      <FormField id="product-category" label="Category">
        <input
          id="product-category"
          type="text"
          value={formData.category}
          onChange={(e) => updateField('category', e.target.value)}
          placeholder="Enter category"
          style={inputStyle}
        />
      </FormField>

      {/* Price */}
      <FormField id="product-price" label="Price (₱)" error={validationErrors.price}>
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
            ref={(el) => { fieldRefs.current.price = el; }}
            type="text"
            inputMode="decimal"
            value={formData.price}
            onChange={(e) => updateField('price', e.target.value)}
            placeholder="0.00"
            style={{
              ...getInputStyle('price'),
              paddingLeft: '36px',
            }}
            aria-invalid={!!validationErrors.price}
            aria-describedby={validationErrors.price ? getErrorId('price') : undefined}
          />
        </div>
      </FormField>

      {/* Expiry Date */}
      <FormField id="product-expiry" label="Expiry Date" error={validationErrors.expiryDate}>
        <input
          id="product-expiry"
          ref={(el) => { fieldRefs.current.expiryDate = el; }}
          type="date"
          value={formData.expiryDate}
          onChange={(e) => updateField('expiryDate', e.target.value)}
          style={getInputStyle('expiryDate')}
          aria-invalid={!!validationErrors.expiryDate}
          aria-describedby={validationErrors.expiryDate ? getErrorId('expiryDate') : undefined}
        />
      </FormField>

      {/* Quantity */}
      <FormField id="product-quantity" label="Quantity" error={validationErrors.quantity}>
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
            ref={(el) => { fieldRefs.current.quantity = el; }}
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
              ...getInputStyle('quantity'),
              flex: 1,
              textAlign: 'center',
            }}
            aria-invalid={!!validationErrors.quantity}
            aria-describedby={validationErrors.quantity ? getErrorId('quantity') : undefined}
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
      </FormField>

      {/* Error message */}
      {error && (
        <div
          role="alert"
          aria-live="polite"
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
            {isNewProduct ? 'Adding...' : 'Updating...'}
          </>
        ) : (
          isNewProduct ? 'Add to Inventory' : 'Update Inventory'
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
