import { useEffect, useState, useCallback } from 'react';
import { CheckCircle, AlertTriangle, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info';

export interface ToastAction {
  label: string;
  onClick: () => void;
}

export interface ToastMessage {
  id: string;
  type: ToastType;
  text: string;
  /** Optional inline action, e.g. an Undo button. */
  action?: ToastAction;
  /** Override the default lifetime — used to keep an Undo available longer. */
  durationMs?: number;
}

interface ToastProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

const TOAST_DURATION = 3000;

export function Toast({ toasts, onDismiss }: ToastProps) {
  return (
    <div
      className="toast-container"
      style={{
        position: 'fixed',
        bottom: '72px',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 100,
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        alignItems: 'center',
        pointerEvents: 'none',
      }}
    >
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>
  );
}

function ToastItem({ toast, onDismiss }: { toast: ToastMessage; onDismiss: (id: string) => void }) {
  const [visible, setVisible] = useState(false);
  const lifetime = toast.durationMs ?? TOAST_DURATION;

  useEffect(() => {
    // Trigger entrance animation
    requestAnimationFrame(() => setVisible(true));

    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(() => onDismiss(toast.id), 200);
    }, lifetime);

    return () => clearTimeout(timer);
  }, [toast.id, onDismiss, lifetime]);

  const iconMap = {
    success: <CheckCircle size={18} color="var(--color-foreground)" />,
    error: <AlertTriangle size={18} color="var(--color-on-destructive)" />,
    info: <AlertTriangle size={18} color="var(--color-foreground)" />,
  };

  return (
    <div
      className="toast"
      role="status"
      aria-live="polite"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '12px 24px',
        background: 'var(--color-background)',
        color: 'var(--color-foreground)',
        borderRadius: '8px',
        fontSize: '14px',
        fontWeight: 500,
        boxShadow: '0 10px 15px rgba(0,0,0,0.1)',
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(10px)',
        transition: 'opacity 200ms ease, transform 200ms ease',
        pointerEvents: 'auto',
        maxWidth: '90vw',
      }}
    >
      {iconMap[toast.type]}
      <span>{toast.text}</span>
      {toast.action && (
        <button
          onClick={() => {
            toast.action!.onClick();
            setVisible(false);
            setTimeout(() => onDismiss(toast.id), 200);
          }}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--color-accent)',
            cursor: 'pointer',
            padding: '4px 8px',
            fontSize: '14px',
            fontWeight: 700,
            textDecoration: 'underline',
            minHeight: '32px',
          }}
        >
          {toast.action.label}
        </button>
      )}
      <button
        onClick={() => {
          setVisible(false);
          setTimeout(() => onDismiss(toast.id), 200);
        }}
        aria-label="Dismiss"
        style={{
          background: 'transparent',
          border: 'none',
          color: 'var(--color-foreground)',
          cursor: 'pointer',
          padding: '4px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minWidth: '24px',
          minHeight: '24px',
        }}
      >
        <X size={14} />
      </button>
    </div>
  );
}

// Toast queue hook
export function useToast() {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = useCallback(
    (type: ToastType, text: string, options?: { action?: ToastAction; durationMs?: number }) => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
      setToasts((prev) => [...prev, { id, type, text, ...options }]);
    },
    []
  );

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return { toasts, showToast, dismissToast };
}
