import { Package } from 'lucide-react';

interface EmptyStateProps {
  title: string;
  subtitle: string;
  ctaLabel?: string;
  onCta?: () => void;
}

export function EmptyState({ title, subtitle, ctaLabel, onCta }: EmptyStateProps) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '48px 24px',
        textAlign: 'center',
      }}
    >
      <Package size={64} color="#94a3b8" strokeWidth={1.5} />
      <h2
        style={{
          fontSize: '18px',
          fontWeight: 600,
          color: '#0f172a',
          margin: '16px 0 8px',
        }}
      >
        {title}
      </h2>
      <p
        style={{
          fontSize: '14px',
          color: '#475569',
          margin: '0 0 24px',
          maxWidth: '280px',
        }}
      >
        {subtitle}
      </p>
      {ctaLabel && onCta && (
        <button
          onClick={onCta}
          style={{
            background: '#059669',
            color: '#ffffff',
            padding: '12px 24px',
            borderRadius: '8px',
            fontWeight: 600,
            fontSize: '16px',
            minHeight: '44px',
            cursor: 'pointer',
            border: 'none',
            transition: 'opacity 200ms ease',
          }}
        >
          {ctaLabel}
        </button>
      )}
    </div>
  );
}
