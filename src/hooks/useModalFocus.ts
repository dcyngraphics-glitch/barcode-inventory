import { useEffect, useRef, type RefObject } from 'react';

const FOCUSABLE =
  'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

interface UseModalFocusOptions {
  /** The element that opened the modal; focus returns here on close. */
  triggerRef?: RefObject<HTMLElement | null>;
  /** Called when Escape is pressed. */
  onEscape: () => void;
}

/**
 * Shared modal focus behaviour (WCAG 2.4.3 Focus Order).
 *
 * On mount: captures whatever held focus (the trigger), moves focus into the
 * dialog, and locks body scroll. While open: Tab and Shift+Tab cycle inside the
 * dialog rather than escaping to the page behind. On close (Escape, unmount, or
 * an explicit {@link returnFocus}): hands focus back to the trigger.
 *
 * Every modal in the app needs this. It used to be hand-rolled per component,
 * which is how the focus-return and Tab-trap behaviour drifted apart between
 * them — QuickEntryModal had the trap but no focus return, PermissionPromptModal
 * had neither, and only ConfirmDialog did both.
 */
export function useModalFocus(
  dialogRef: RefObject<HTMLElement | null>,
  { triggerRef, onEscape }: UseModalFocusOptions,
) {
  const previousActiveElement = useRef<HTMLElement | null>(null);
  // Keep the latest callback without re-running the effect on every render —
  // re-running it would re-capture the trigger after focus had moved into the
  // dialog, snapping focus back to the first field while the user types.
  const escapeRef = useRef(onEscape);

  useEffect(() => {
    escapeRef.current = onEscape;
  }, [onEscape]);

  useEffect(() => {
    previousActiveElement.current =
      triggerRef?.current ?? (document.activeElement as HTMLElement);

    const dialog = dialogRef.current;
    dialog?.querySelector<HTMLElement>(FOCUSABLE)?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        previousActiveElement.current?.focus();
        escapeRef.current();
        return;
      }
      if (e.key !== 'Tab' || !dialog) return;

      const items = dialog.querySelectorAll<HTMLElement>(FOCUSABLE);
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last?.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first?.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
      previousActiveElement.current?.focus();
    };
  }, [dialogRef, triggerRef]);

  /**
   * Hand focus back to the trigger. Call this before closing the modal from a
   * button so the return is immediate rather than waiting for the unmount
   * cleanup — the two are idempotent, so calling both is harmless.
   */
  const returnFocus = () => previousActiveElement.current?.focus();

  return { returnFocus };
}

/** Focusable-element selector, exported for tests that assert the trap. */
export const MODAL_FOCUSABLE_SELECTOR = FOCUSABLE;
