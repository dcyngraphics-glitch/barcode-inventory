import { useRef, type FC } from 'react';
import { useModalFocus } from '@/hooks/useModalFocus';

interface PermissionPromptModalProps {
  onConfirm: () => void;
  onDeny: () => void;
  /** The element that triggered the modal; focus returns here on close. */
  triggerRef?: React.RefObject<HTMLElement | null>;
}

export const PermissionPromptModal: FC<PermissionPromptModalProps> = ({
  onConfirm,
  onDeny,
  triggerRef,
}) => {
  const dialogRef = useRef<HTMLDivElement>(null);

  // Focus moves into the dialog on mount, Tab cycles inside it, Escape closes,
  // and focus returns to the trigger on close (WCAG 2.4.3).
  const { returnFocus } = useModalFocus(dialogRef, { triggerRef, onEscape: onDeny });

  const handleDeny = () => {
    returnFocus();
    onDeny();
  };

  const handleConfirm = () => {
    returnFocus();
    onConfirm();
  };

  return (
    <div className="permission-prompt-modal-overlay" onClick={handleDeny}>
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="permission-prompt-modal-title"
        className="permission-prompt-modal-content"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="permission-prompt-modal-title" className="permission-prompt-modal-title">
          Allow Camera Access
        </h2>
        <p className="permission-prompt-modal-description">
          We need access to your camera to scan barcodes and add products to your inventory.
        </p>
        <div className="permission-prompt-modal-buttons">
          <button
            className="permission-prompt-modal-button permission-prompt-modal-button-deny"
            onClick={handleDeny}
          >
            Deny
          </button>
          <button
            className="permission-prompt-modal-button permission-prompt-modal-button-confirm"
            onClick={handleConfirm}
          >
            Allow
          </button>
        </div>
      </div>
    </div>
  );
};
