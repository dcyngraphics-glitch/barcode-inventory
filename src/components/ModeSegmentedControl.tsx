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
  const handleChange = (newMode: 'auto' | 'manual') => {
    if (newMode !== mode) {
      onChange(newMode);
    }
  };

  return (
    <div className={`mode-segmented-control${className ? ` ${className}` : ''}`} role="group" aria-label="Scan mode">
      <button
        className={`mode-segmented-button${mode === 'auto' ? ' active' : ''}`}
        onClick={() => handleChange('auto')}
      >
        Auto
      </button>
      <button
        className={`mode-segmented-button${mode === 'manual' ? ' active' : ''}`}
        onClick={() => handleChange('manual')}
      >
        Manual
      </button>
    </div>
  );
};