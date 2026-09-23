import { useState, useEffect, useRef, useCallback } from 'react';
import { X, Calendar, AlertCircle } from 'lucide-react';
import { Batch } from '@/types';

interface EditBatchSheetProps {
  open: boolean;
  batch: Batch;
  onSave: (batch: Batch) => void;
  onCancel: () => void;
}

/**
 * Validate batch fields.
 * Returns an error message if invalid, or null if valid.
 */
function validateBatch(batch: Partial<Batch>): string | null {
  const { quantity, expiryDate } = batch;

  if (quantity !== undefined && quantity !== null) {
    if (typeof quantity !== 'number' || isNaN(quantity) || quantity <= 0) {
      return 'Quantity must be a positive number';
    }
    // Optionally ensure integer
    if (!Number.isInteger(quantity)) {
      return 'Quantity must be a whole number';
    }
  }

  if (expiryDate !== undefined && expiryDate !== null) {
    if (expiryDate.trim() !== '') {
      const date = new Date(expiryDate);
      if (isNaN(date.getTime())) {
        return 'Expiry date must be a valid date';
      }
    }
  }

  // Notes can be any string, no validation needed
  return null;
}

export function EditBatchSheet({ open, batch, onSave, onCancel }: EditBatchSheetProps) {
  const [formBatch, setFormBatch] = useState<Batch>(batch);
  const [validationError, setValidationError] = useState<string | null>(null);
  const sheetRef = useRef<HTMLDivElement | null>(null);
  const quantityRef = useRef<HTMLInputElement | null>(null);
  const expiryRef = useRef<HTMLInputElement | null>(null);
  const notesRef = useRef<HTMLTextAreaElement | null>(null);

  // Focus trap and Escape key handler
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCancel();
        return;
      }
      if (e.key === 'Tab' && sheetRef.current) {
        const focusableElements = sheetRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];
        if (e.shiftKey && document.activeElement === firstElement) {
          e.preventDefault();
          lastElement?.focus();
        } else if (!e.shiftKey && document.activeElement === lastElement) {
          e.preventDefault();
          firstElement?.focus();
        }
      }
    },
    [onCancel]
  );

  useEffect(() => {
    if (open) {
      document.addEventListener('keydown', handleKeyDown);
      // Focus the quantity input when sheet opens
      setTimeout(() => quantityRef.current?.focus(), 100);
      // Prevent body scroll
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [open, handleKeyDown]);

  // Reset state when sheet closes
  useEffect(() => {
    if (!open) {
      setFormBatch(batch);
      setValidationError(null);
    }
  }, [open, batch]);

  const handleFieldChange = (
    field: keyof Batch,
    value: string | number
  ) => {
    setFormBatch(prev => ({
      ...prev,
      [field]: value,
    }));
    // Clear validation error on user input
    setValidationError(null);
  };

  const handleQuantityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Allow empty temporarily, but validate on submit
    const num = value === '' ? null : Number(value);
    handleFieldChange('quantity', num ?? 0);
  };

  const handleExpiryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFieldChange('expiryDate', e.target.value);
  };

  const handleNotesChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    handleFieldChange('notes', e.target.value);
  };

  if (!open) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const error = validateBatch(formBatch);
    if (error) {
      setValidationError(error);
      return;
    }
    onSave(formBatch);
    onCancel();
  };

  const isSubmitDisabled =
    formBatch.quantity === null ||
    formBatch.quantity <= 0 ||
    isNaN(formBatch.quantity) ||
    (formBatch.expiryDate.trim() !== '' && isNaN(new Date(formBatch.expiryDate).getTime()));

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onCancel}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          zIndex: 40,
          animation: 'fade-in 150ms ease',
        }}
      />
      {/* Bottom sheet */}
      <div
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-batch-title"
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          background: '#ffffff',
          borderRadius: '16px 16px 0 0',
          padding: '24px',
          paddingBottom: 'calc(24px + env(safe-area-inset-bottom))',
          boxShadow: '0 -10px 15px rgba(0, 0, 0, 0.1)',
          maxWidth: '500px',
          margin: '0 auto',
          zIndex: 50,
          animation: 'slide-up 200ms ease',
        }}
      >
        {/* Drag handle */}
        <div
          style={{
            width: '40px',
            height: '4px',
            background: '#e6e8ea',
            borderRadius: '999px',
            margin: '0 auto 16px',
          }}
        />
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '20px',
          }}
        >
          <h2
            id="edit-batch-title"
            style={{
              fontSize: '18px',
              fontWeight: 600,
              color: '#0f172a',
              margin: 0,
            }}
          >
            Edit Batch
          </h2>
          <button
            onClick={onCancel}
            aria-label="Close"
            style={{
              background: 'transparent',
              border: 'none',
              padding: '8px',
              cursor: 'pointer',
              color: '#475569',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              minWidth: '44px',
              minHeight: '44px',
            }}
          >
            <X size={24} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          {/* Quantity */}
          <div style={{ marginBottom: '16px' }}>
            <label
              htmlFor="quantity-input"
              style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: 500,
                color: '#0f172a',
                marginBottom: '4px',
              }}
            >
              Quantity
            </label>
            <input
              ref={quantityRef}
              id="quantity-input"
              type="number"
              inputMode="decimal"
              min="1"
              value={formBatch.quantity ?? ''}
              onChange={handleQuantityChange}
              placeholder="e.g. 10"
              autoFocus
              aria-invalid={!!validationError && validationError.includes('Quantity')}
              aria-describedby={validationError && validationError.includes('Quantity') ? 'quantity-error' : undefined}
              style={{
                padding: '12px 16px',
                border: validationError && validationError.includes('Quantity')
                  ? '2px solid #DC2626'
                  : '1px solid #e6e8ea',
                borderRadius: '8px',
                fontSize: '16px',
                fontFamily: 'Inter, sans-serif',
                background: '#ffffff',
                color: '#0f172a',
                width: '100%',
                transition: 'border-color 200ms ease, box-shadow 200ms ease',
                outline: 'none',
              }}
              onFocus={(e) => {
                e.target.style.borderColor = '#334155';
                e.target.style.boxShadow = '0 0 0 3px rgba(51, 65, 85, 0.15)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor =
                  validationError && validationError.includes('Quantity')
                    ? '#DC2626'
                    : '#e6e8ea';
                e.target.style.boxShadow = 'none';
              }}
            />
            {validationError && validationError.includes('Quantity') && (
              <div
                id="quantity-error"
                role="alert"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  marginTop: '6px',
                  color: '#DC2626',
                  fontSize: '12px',
                  fontWeight: 500,
                }}
              >
                <AlertCircle size={14} />
                {validationError}
              </div>
            )}
          </div>

          {/* Expiry Date */}
          <div style={{ marginBottom: '16px' }}>
            <label
              htmlFor="expiry-input"
              style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: 500,
                color: '#0f172a',
                marginBottom: '4px',
              }}
            >
              Expiry Date (optional)
            </label>
            <input
              ref={expiryRef}
              id="expiry-input"
              type="date"
              value={formBatch.expiryDate ?? ''}
              onChange={handleExpiryChange}
              aria-invalid={!!validationError && validationError.includes('Expiry')}
              aria-describedby={validationError && validationError.includes('Expiry') ? 'expiry-error' : undefined}
              style={{
                padding: '12px 16px',
                border: validationError && validationError.includes('Expiry')
                  ? '2px solid #DC2626'
                  : '1px solid #e6e8ea',
                borderRadius: '8px',
                fontSize: '16px',
                fontFamily: 'Inter, sans-serif',
                background: '#ffffff',
                color: '#0f172a',
                width: '100%',
                transition: 'border-color 200ms ease, box-shadow 200ms ease',
                outline: 'none',
              }}
              onFocus={(e) => {
                e.target.style.borderColor = '#334155';
                e.target.style.boxShadow = '0 0 0 3px rgba(51, 65, 85, 0.15)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor =
                  validationError && validationError.includes('Expiry')
                    ? '#DC2626'
                    : '#e6e8ea';
                e.target.style.boxShadow = 'none';
              }}
            />
            {validationError && validationError.includes('Expiry') && (
              <div
                id="expiry-error"
                role="alert"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  marginTop: '6px',
                  color: '#DC2626',
                  fontSize: '12px',
                  fontWeight: 500,
                }}
              >
                <AlertCircle size={14} />
                {validationError}
              </div>
            )}
          </div>

          {/* Notes */}
          <div style={{ marginBottom: '24px' }}>
            <label
              htmlFor="notes-input"
              style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: 500,
                color: '#0f172a',
                marginBottom: '4px',
              }}
            >
              Notes (optional)
            </label>
            <textarea
              ref={notesRef}
              id="notes-input"
              value={formBatch.notes ?? ''}
              onChange={handleNotesChange}
              rows={3}
              placeholder="Add any notes about this batch..."
              aria-invalid={false}
              style={{
                width: '100%',
                padding: '12px 16px',
                border: '1px solid #e6e8ea',
                borderRadius: '8px',
                fontSize: '16px',
                fontFamily: 'Inter, sans-serif',
                background: '#ffffff',
                color: '#0f172a',
                resize: 'vertical',
                outline: 'none',
                transition: 'border-color 200ms ease, box-shadow 200ms ease',
              }}
              onFocus={(e) => {
                e.target.style.borderColor = '#334155';
                e.target.style.boxShadow = '0 0 0 3px rgba(51, 65, 85, 0.15)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = '#e6e8ea';
                e.target.style.boxShadow = 'none';
              }}
            />
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              type="button"
              onClick={onCancel}
              style={{
                flex: 1,
                background: '#f8fafc',
                color: '#0f172a',
                padding: '12px 24px',
                borderRadius: '8px',
                fontWeight: 600,
                fontSize: '16px',
                minHeight: '44px',
                cursor: 'pointer',
                border: '1px solid #e6e8ea',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 200ms ease',
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitDisabled}
              style={{
                flex: 1,
                background: isSubmitDisabled ? '#e6e8ea' : '#059669',
                color: isSubmitDisabled ? '#94a3b8' : '#ffffff',
                padding: '12px 24px',
                borderRadius: '8px',
                fontWeight: 600,
                fontSize: '16px',
                minHeight: '44px',
                cursor: isSubmitDisabled ? 'not-allowed' : 'pointer',
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                transition: 'all 200ms ease',
              }}
            >
              <Calendar size={20} />
              Save
            </button>
          </div>
        </form>
      </div>

      <style>{`
        @keyframes slide-up {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
    </>
  );
}