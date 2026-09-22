import { Minus, Plus } from 'lucide-react';

interface SettingsStepperProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  disabled?: boolean;
  label: string;
  helperText?: string;
}

export function SettingsStepper({
  value,
  onChange,
  min = 1,
  max = 30,
  disabled = false,
  label,
  helperText,
}: SettingsStepperProps) {
  const handleDecrement = () => {
    if (disabled) return;
    const newValue = Math.max(min, value - 1);
    onChange(newValue);
  };

  const handleIncrement = () => {
    if (disabled) return;
    const newValue = Math.min(max, value + 1);
    onChange(newValue);
  };

  return (
    <div
      style={{
        opacity: disabled ? 0.5 : 1,
        transition: 'opacity 200ms ease',
      }}
    >
      <div
        style={{
          fontSize: '16px',
          fontWeight: 500,
          color: '#0f172a',
          marginBottom: '8px',
        }}
      >
        {label}
      </div>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
        }}
      >
        <button
          onClick={handleDecrement}
          disabled={disabled || value <= min}
          aria-label={`Decrease ${label.toLowerCase()}`}
          style={{
            width: '44px',
            height: '44px',
            borderRadius: '8px',
            border: '1px solid #e6e8ea',
            background: '#ffffff',
            color: '#334155',
            cursor: disabled || value <= min ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            opacity: disabled || value <= min ? 0.4 : 1,
            transition: 'opacity 200ms ease',
            flexShrink: 0,
          }}
        >
          <Minus size={20} />
        </button>
        <div
          style={{
            minWidth: '48px',
            textAlign: 'center',
            fontSize: '18px',
            fontWeight: 600,
            color: '#0f172a',
          }}
        >
          {value}
        </div>
        <button
          onClick={handleIncrement}
          disabled={disabled || value >= max}
          aria-label={`Increase ${label.toLowerCase()}`}
          style={{
            width: '44px',
            height: '44px',
            borderRadius: '8px',
            border: '1px solid #e6e8ea',
            background: '#ffffff',
            color: '#334155',
            cursor: disabled || value >= max ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            opacity: disabled || value >= max ? 0.4 : 1,
            transition: 'opacity 200ms ease',
            flexShrink: 0,
          }}
        >
          <Plus size={20} />
        </button>
        <div
          style={{
            fontSize: '14px',
            color: '#475569',
          }}
        >
          days
        </div>
      </div>
      {helperText && (
        <div
          style={{
            fontSize: '12px',
            color: '#475569',
            marginTop: '6px',
            lineHeight: 1.4,
          }}
        >
          {helperText}
        </div>
      )}
    </div>
  );
}
