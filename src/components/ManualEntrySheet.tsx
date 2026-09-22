import { useState, useEffect, useRef, useCallback } from 'react';
import { X, Search, AlertCircle } from 'lucide-react';

interface ManualEntrySheetProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (barcode: string) => void;
}

/**
 * Validate barcode format.
 * Returns an error message if invalid, or null if valid.
 * Bug fix #5: Barcode must be digits-only with minimum length 8.
 */
function validateBarcode(barcode: string): string | null {
  if (!barcode) return null; // Empty is not an error (just disabled button)
  if (!/^\d+$/.test(barcode)) {
    return 'Barcode must contain only digits';
  }
  if (barcode.length < 8) {
    return 'Barcode must be at least 8 digits';
  }
  return null;
}

export function ManualEntrySheet({ open, onClose, onSubmit }: ManualEntrySheetProps) {
  const [barcode, setBarcode] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const sheetRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Focus trap and Escape key handler
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
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
    [onClose]
  );

  useEffect(() => {
    if (open) {
      document.addEventListener('keydown', handleKeyDown);
      // Focus the input when sheet opens
      setTimeout(() => inputRef.current?.focus(), 100);
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
      setBarcode('');
      setValidationError(null);
    }
  }, [open]);

  // Bug fix #5: Validate barcode on change
  const handleBarcodeChange = (value: string) => {
    setBarcode(value);
    setValidationError(validateBarcode(value));
  };

  if (!open) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = barcode.trim();
    
    // Bug fix #5: Validate before submitting
    const error = validateBarcode(trimmed);
    if (error) {
      setValidationError(error);
      return;
    }
    
    onSubmit(trimmed);
    setBarcode('');
    setValidationError(null);
    onClose();
  };

  const trimmed = barcode.trim();
  const isInvalid = !!validateBarcode(trimmed);
  const isSubmitDisabled = !trimmed || isInvalid;

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
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
        aria-labelledby="manual-entry-title"
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
            id="manual-entry-title"
            style={{
              fontSize: '18px',
              fontWeight: 600,
              color: '#0f172a',
              margin: 0,
            }}
          >
            Enter Barcode
          </h2>
          <button
            onClick={onClose}
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
          <div style={{ marginBottom: '16px' }}>
            <label
              htmlFor="barcode-input"
              style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: 500,
                color: '#0f172a',
                marginBottom: '4px',
              }}
            >
              Barcode Number
            </label>
            <input
              ref={inputRef}
              id="barcode-input"
              type="text"
              inputMode="numeric"
              value={barcode}
              onChange={(e) => handleBarcodeChange(e.target.value)}
              placeholder="e.g. 4800012345678"
              autoFocus
              aria-invalid={isInvalid}
              aria-describedby={validationError ? 'barcode-error' : undefined}
              style={{
                padding: '12px 16px',
                border: validationError ? '2px solid #DC2626' : '1px solid #e6e8ea',
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
                e.target.style.borderColor = validationError ? '#DC2626' : '#e6e8ea';
                e.target.style.boxShadow = 'none';
              }}
            />
            {/* Bug fix #5: Show validation error message */}
            {validationError && (
              <div
                id="barcode-error"
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

          <button
            type="submit"
            disabled={isSubmitDisabled}
            style={{
              width: '100%',
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
            <Search size={20} />
            Look Up
          </button>
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
