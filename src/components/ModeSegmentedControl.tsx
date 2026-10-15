import { FC } from 'react';

interface ModeSegmentedControlProps {
  mode: 'auto' | 'manual';
  onChange: (mode: 'auto' | 'manual') => void;
  className?: string;
}

export const ModeSegmentedControl: FC<ModeSegmentedControlProps> = ({
  mode,
  onChange,
  className,
}) => {
  const isAuto = mode === 'auto';

  return (
    <button
      type="button"
      role="switch"
      aria-checked={!isAuto}
      aria-label={`Scan mode: ${isAuto ? 'Auto' : 'Manual'}`}
      className={`mode-toggle${className ? ` ${className}` : ''}`}
      onClick={() => onChange(isAuto ? 'manual' : 'auto')}
    >
      <span className="mode-toggle-track">
        <span className="mode-toggle-label mode-toggle-label--auto">
          Auto
        </span>
        <span className="mode-toggle-label mode-toggle-label--manual">
          Manual
        </span>
        <span className="mode-toggle-thumb">
          <svg
            className="mode-toggle-icon"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            {isAuto ? (
              <>
                <path d="M21 12a9 9 0 1 1-6.219-8.56" />
              </>
            ) : (
              <>
                <rect x="3" y="7" width="18" height="10" rx="2" />
                <circle cx="8.5" cy="12" r="2" />
              </>
            )}
          </svg>
        </span>
      </span>
    </button>
  );
};
