import { FC } from 'react';

interface PermissionPromptModalProps {
  onConfirm: () => void;
  onDeny: () => void;
}

export const PermissionPromptModal: FC<PermissionPromptModalProps> = ({
  onConfirm,
  onDeny,
}) => {
  return (
    <div className="permission-prompt-modal-overlay" onClick={onDeny}>
      <div className="permission-prompt-modal-content" onClick={(e) => e.stopPropagation()}>
        <h2 className="permission-prompt-modal-title">Allow Camera Access</h2>
        <p className="permission-prompt-modal-description">
          We need access to your camera to scan barcodes and add products to your inventory.
        </p>
        <div className="permission-prompt-modal-buttons">
          <button className="permission-prompt-modal-button permission-prompt-modal-button-deny" onClick={onDeny}>
            Deny
          </button>
          <button className="permission-prompt-modal-button permission-prompt-modal-button-confirm" onClick={onConfirm}>
            Allow
          </button>
        </div>
      </div>
    </div>
  );
};