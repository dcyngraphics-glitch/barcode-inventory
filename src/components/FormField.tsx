import type { ReactNode } from 'react';

interface FormFieldProps {
  id: string;
  label: string;
  error?: string;
  children: ReactNode;
}

export function FormField({ id, label, error, children }: FormFieldProps) {
  return (
    <div>
      <label
        htmlFor={id}
        style={{
          display: 'block',
          fontSize: '14px',
          fontWeight: 500,
          color: '#0F172A',
          marginBottom: '4px',
        }}
      >
        {label}
      </label>
      {children}
      {error && (
        <span
          style={{ fontSize: '12px', color: '#DC2626', marginTop: '4px', display: 'block' }}
          role="alert"
          aria-live="polite"
        >
          {error}
        </span>
      )}
    </div>
  );
}
