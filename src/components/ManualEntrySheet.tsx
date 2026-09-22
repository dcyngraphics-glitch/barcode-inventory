import { useState, useEffect, useRef, useCallback } from 'react';
import { X, Search } from 'lucide-react';

interface ManualEntrySheetProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (barcode: string) => void;
}

export function ManualEntrySheet({ open, onClose, onSubmit }: ManualEntrySheetProps) {
  const [barcode, setBarcode] = useState('');
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

  if (!open) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = barcode.trim();
    if (!trimmed) return;
    onSubmit(trimmed);
    setBarcode('');
    onClose();
  };

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
              onChange={(e) => setBarcode(e.target.value)}
              placeholder="e.g. 4800012345678"
              autoFocus
              style={{
                padding: '12px 16px',
                border: '1px solid #e6e8ea',
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
                e.target.style.borderColor = '#e6e8ea';
                e.target.style.boxShadow = 'none';
              }}
            />
          </div>

          <button
            type="submit"
            disabled={!barcode.trim()}
            style={{
              width: '100%',
              background: barcode.trim() ? '#059669' : '#e6e8ea',
              color: barcode.trim() ? '#ffffff' : '#94a3b8',
              padding: '12px 24px',
              borderRadius: '8px',
              fontWeight: 600,
              fontSize: '16px',
              minHeight: '44px',
              cursor: barcode.trim() ? 'pointer' : 'not-allowed',
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
