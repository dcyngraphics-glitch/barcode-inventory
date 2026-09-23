import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { useTutorial } from '@/context/TutorialContext';
import { markScreenHintSeen, getTutorialStatus } from '@/services/tutorialService';
import './ScreenTooltip.css';

interface ScreenTooltipProps {
  screenId: string;
  message: string;
}

export function ScreenTooltip({ screenId, message }: ScreenTooltipProps) {
  const { isVisible: isTutorialVisible } = useTutorial();
  const [show, setShow] = useState(false);

  useEffect(() => {
    // Don't show screen hints while the main tutorial overlay is visible
    if (isTutorialVisible) {
      setShow(false);
      return;
    }
    getTutorialStatus()
      .then((status) => {
        if (!status.screenHintsSeen.includes(screenId)) {
          setShow(true);
        }
      })
      .catch(() => {
        // If loading fails, don't show the hint
      });
  }, [screenId, isTutorialVisible]);

  const handleDismiss = () => {
    setShow(false);
    markScreenHintSeen(screenId);
  };

  if (!show) return null;

  return (
    <div
      className="screen-tooltip"
      role="status"
      aria-live="polite"
    >
      <span className="screen-tooltip-message">{message}</span>
      <button
        className="screen-tooltip-btn"
        onClick={handleDismiss}
      >
        Got it
      </button>
      <button
        onClick={handleDismiss}
        aria-label="Dismiss"
        style={{
          background: 'transparent',
          border: 'none',
          color: 'var(--color-muted-foreground)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minWidth: '24px',
          minHeight: '24px',
          flexShrink: 0,
          padding: '4px',
        }}
      >
        <X size={14} />
      </button>
    </div>
  );
}
