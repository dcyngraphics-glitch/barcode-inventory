import { useState, useEffect, useRef } from 'react';
import { Search } from 'lucide-react';

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  debounceMs?: number;
}

export function SearchBar({
  value,
  onChange,
  placeholder = 'Search products',
  debounceMs = 200,
}: SearchBarProps) {
  const [localValue, setLocalValue] = useState(value);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync external value changes
  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const handleChange = (newValue: string) => {
    setLocalValue(newValue);

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      onChange(newValue);
    }, debounceMs);
  };

  // Cleanup
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  return (
    <div
      style={{
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
      }}
    >
      <Search
        size={18}
        color="#94a3b8"
        style={{
          position: 'absolute',
          left: '12px',
          pointerEvents: 'none',
        }}
      />
      <input
        type="text"
        value={localValue}
        onChange={(e) => handleChange(e.target.value)}
        placeholder={placeholder}
        aria-label="Search products"
        style={{
          padding: '12px 16px 12px 40px',
          border: '1px solid #e6e8ea',
          borderRadius: '8px',
          fontSize: '16px',
          fontFamily: 'Inter, sans-serif',
          background: '#ffffff',
          color: '#0f172a',
          width: '100%',
          transition: 'border-color 200ms ease, box-shadow 200ms ease',
          outline: 'none',
        }}
        onFocus={(e) => {
          e.target.style.borderColor = '#334155';
          e.target.style.boxShadow = '0 0 0 3px rgba(51, 65, 85, 0.15)';
        }}
        onBlur={(e) => {
          e.target.style.borderColor = '#e6e8ea';
          e.target.style.boxShadow = 'none';
        }}
      />
    </div>
  );
}
