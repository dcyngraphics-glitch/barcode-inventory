import { useEffect, useRef } from 'react';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  body: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'default' | 'destructive';
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  body,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'default',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const dialogRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCancel();
        return;
      }
      if (e.key === 'Tab' && dialogRef.current) {
        const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [open, onCancel]);

  if (!open) return null;

  const isDestructive = variant === 'destructive';

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onCancel}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          zIndex: 60,
          animation: 'fade-in 150ms ease',
        }}
      />

      {/* Dialog */}
      <div
        ref={dialogRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        aria-describedby="confirm-body"
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          background: '#ffffff',
          borderRadius: '16px',
          padding: '24px',
          boxShadow: '0 20px 25px rgba(0,0,0,0.15)',
          maxWidth: '400px',
          width: '90vw',
          zIndex: 70,
          animation: 'slide-up 200ms ease',
        }}
      >
        <h2
          id="confirm-title"
          style={{
            fontSize: '18px',
            fontWeight: 600,
            color: '#0f172a',
            margin: '0 0 8px',
          }}
        >
          {title}
        </h2>
        <p
          id="confirm-body"
          style={{
            fontSize: '14px',
            color: '#475569',
            margin: '0 0 24px',
            lineHeight: 1.5,
          }}
        >
          {body}
        </p>

        <div
          style={{
            display: 'flex',
            gap: '12px',
            justifyContent: 'flex-end',
          }}
        >
          <button
            onClick={onCancel}
            style={{
              background: 'transparent',
              color: '#334155',
              padding: '8px 16px',
              fontWeight: 500,
              fontSize: '14px',
              minHeight: '44px',
              cursor: 'pointer',
              border: 'none',
              borderRadius: '8px',
            }}
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            style={{
              background: isDestructive ? '#dc2626' : '#059669',
              color: '#ffffff',
              padding: '8px 16px',
              fontWeight: 600,
              fontSize: '14px',
              minHeight: '44px',
              cursor: 'pointer',
              border: 'none',
              borderRadius: '8px',
              transition: 'opacity 200ms ease',
            }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slide-up {
          from { transform: translate(-50%, -50%) translateY(20px); opacity: 0; }
          to { transform: translate(-50%, -50%) translateY(0); opacity: 1; }
        }
      `}</style>
    </>
  );
}
