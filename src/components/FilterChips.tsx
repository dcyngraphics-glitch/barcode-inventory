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
    <div className="filter-chips filter-chips--spacious" role="tablist" aria-label="Filter by expiry status">
      {FILTERS.map((filter) => {
        const isActive = active === filter.key;
        return (
          <button
            key={filter.key}
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(filter.key)}
            className={`filter-chip ${isActive ? 'filter-chip-active' : 'filter-chip-inactive'}`}
          >
            {filter.label}
          </button>
        );
      })}
    </div>
  );
}
