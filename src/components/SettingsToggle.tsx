interface SettingsToggleProps {
  enabled: boolean;
  onChange: (enabled: boolean) => void;
  disabled?: boolean;
  label: string;
  description?: string;
}

export function SettingsToggle({
  enabled,
  onChange,
  disabled = false,
  label,
  description,
}: SettingsToggleProps) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '12px',
        opacity: disabled ? 0.5 : 1,
        transition: 'opacity 200ms ease',
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: '16px',
            fontWeight: 500,
            color: '#0f172a',
            marginBottom: description ? '2px' : 0,
          }}
        >
          {label}
        </div>
        {description && (
          <div
            style={{
              fontSize: '14px',
              color: '#475569',
              lineHeight: 1.4,
            }}
          >
            {description}
          </div>
        )}
      </div>
      <button
        role="switch"
        aria-checked={enabled}
        aria-label={label}
        disabled={disabled}
        onClick={() => onChange(!enabled)}
        style={{
          position: 'relative',
          width: '52px',
          height: '32px',
          borderRadius: '999px',
          border: 'none',
          cursor: disabled ? 'not-allowed' : 'pointer',
          background: enabled ? '#059669' : '#cbd5e1',
          transition: 'background 200ms ease',
          flexShrink: 0,
          padding: 0,
        }}
      >
        <span
          style={{
            position: 'absolute',
            top: '4px',
            left: enabled ? '24px' : '4px',
            width: '24px',
            height: '24px',
            borderRadius: '50%',
            background: '#ffffff',
            boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
            transition: 'left 200ms ease',
          }}
        />
      </button>
    </div>
  );
}
