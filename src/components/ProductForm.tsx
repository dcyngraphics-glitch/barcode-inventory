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

  const getErrorId = (field: string) => `${field}-error`;

  return (
    <form onSubmit={handleSubmit} className="form-stack">
      {/* Product Name */}
      <FormField id="product-name" label="Product Name" error={validationErrors.name}>
        <input
          id="product-name"
          ref={(el) => { fieldRefs.current.name = el; }}
          type="text"
          value={formData.name}
          onChange={(e) => updateField('name', e.target.value)}
          placeholder="Enter product name"
          className={`form-input${validationErrors.name ? ' form-input-error' : ''}`}
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
          className="form-input"
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
          className="form-input"
        />
      </FormField>

      {/* Price */}
      <FormField id="product-price" label="Price (₱)" error={validationErrors.price}>
        <div className="form-currency-wrap">
          <span className="form-currency-symbol">₱</span>
          <input
            id="product-price"
            ref={(el) => { fieldRefs.current.price = el; }}
            type="text"
            inputMode="decimal"
            value={formData.price}
            onChange={(e) => updateField('price', e.target.value)}
            placeholder="0.00"
            className={`form-input form-currency-input${validationErrors.price ? ' form-input-error' : ''}`}
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
          className={`form-input${validationErrors.expiryDate ? ' form-input-error' : ''}`}
          aria-invalid={!!validationErrors.expiryDate}
          aria-describedby={validationErrors.expiryDate ? getErrorId('expiryDate') : undefined}
        />
      </FormField>

      {/* Quantity */}
      <FormField id="product-quantity" label="Quantity" error={validationErrors.quantity}>
        <div className="form-stepper">
          <button
            type="button"
            onClick={decrementQuantity}
            disabled={formData.quantity <= 1}
            className="form-stepper-btn"
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
            className="form-input form-stepper-input"
            aria-invalid={!!validationErrors.quantity}
            aria-describedby={validationErrors.quantity ? getErrorId('quantity') : undefined}
          />
          <button
            type="button"
            onClick={incrementQuantity}
            className="form-stepper-btn"
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
          className="form-error-box"
        >
          {error}
        </div>
      )}

      {/* Submit Button */}
      <button
        type="submit"
        disabled={loading}
        className="form-submit"
      >
        {loading ? (
          <>
            <span className="spinner-inline" />
            {isNewProduct ? 'Adding...' : 'Updating...'}
          </>
        ) : (
          isNewProduct ? 'Add to Inventory' : 'Update Inventory'
        )}
      </button>
    </form>
  );
}
