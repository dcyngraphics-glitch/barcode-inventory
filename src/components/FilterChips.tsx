export type FilterType = 'all' | 'expiring' | 'expired' | 'good';

interface FilterChipsProps {
  active: FilterType;
  onChange: (filter: FilterType) => void;
}

const FILTERS: { key: FilterType; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'expiring', label: 'Expiring Soon' },
  { key: 'expired', label: 'Expired' },
  { key: 'good', label: 'Good' },
];

export function FilterChips({ active, onChange }: FilterChipsProps) {
  return (
    <div
      role="tablist"
      aria-label="Filter by expiry status"
      style={{
        display: 'flex',
        gap: '8px',
        overflowX: 'auto',
        padding: '4px 0',
        WebkitOverflowScrolling: 'touch',
        scrollbarWidth: 'none',
      }}
    >
      {FILTERS.map((filter) => {
        const isActive = active === filter.key;
        return (
          <button
            key={filter.key}
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(filter.key)}
            style={{
              background: isActive ? '#334155' : '#f2f3f4',
              color: isActive ? '#ffffff' : '#475569',
              padding: '6px 16px',
              borderRadius: '999px',
              fontSize: '14px',
              fontWeight: 500,
              whiteSpace: 'nowrap',
              cursor: 'pointer',
              border: 'none',
              minHeight: '44px',
              transition: 'all 200ms ease',
              flexShrink: 0,
            }}
          >
            {filter.label}
          </button>
        );
      })}
    </div>
  );
}
