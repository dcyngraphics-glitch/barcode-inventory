import { useRef, type FC, type KeyboardEvent } from 'react';
import { useMode, type AppMode } from '@/context/ModeContext';

const SEGMENTS: { value: AppMode; label: string }[] = [
  { value: 'shop', label: 'Shop' },
  { value: 'sell', label: 'Sell' },
];

/**
 * Always-visible app-mode switcher for the app bar.
 *
 * Deliberately distinct from ModeSegmentedControl — the Auto/Manual scan switch
 * rendered at ScannerScreen.tsx:308 — on three axes, so the two controls cannot be
 * confused for each other:
 *   - position:    header (top) rather than the camera area
 *   - shape:       segmented pill rather than a toggle switch
 *   - vocabulary:  nouns (Shop/Sell) rather than adjectives (Auto/Manual)
 *
 * The group is also labelled without the word "mode" for the same reason: that word
 * already means the scan method on this screen.
 */
export const AppModeSwitcher: FC = () => {
  const { mode, setMode, hasLoaded } = useMode();
  const buttonRefs = useRef<Array<HTMLButtonElement | null>>([]);

  // Render nothing until the mode is known, so the header cannot flash the wrong
  // state on cold start.
  if (!hasLoaded) return null;

  const handleKeyDown = (e: KeyboardEvent<HTMLButtonElement>, index: number): void => {
    const step = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
    if (step === 0) return; // every other key is left to the browser
    e.preventDefault();
    const next = (index + step + SEGMENTS.length) % SEGMENTS.length;
    const target = SEGMENTS[next];
    if (!target) return;
    setMode(target.value);
    buttonRefs.current[next]?.focus();
  };

  return (
    <div className="app-mode-switcher" role="radiogroup" aria-label="App section">
      {SEGMENTS.map((segment, index) => {
        const active = mode === segment.value;
        return (
          <button
            key={segment.value}
            ref={(el) => {
              buttonRefs.current[index] = el;
            }}
            type="button"
            role="radio"
            aria-checked={active}
            // Roving tabindex: the group is one tab stop, arrows move within it.
            tabIndex={active ? 0 : -1}
            className={`app-mode-segment${active ? ' app-mode-segment--active' : ''}`}
            onClick={() => setMode(segment.value)}
            onKeyDown={(e) => handleKeyDown(e, index)}
          >
            {segment.label}
          </button>
        );
      })}
    </div>
  );
};
