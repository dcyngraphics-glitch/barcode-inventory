export function generateId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `id-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

export function formatDate(isoDate: string): string {
  if (!isoDate) return '';
  const d = new Date(isoDate);
  return d.toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' });
}

export function formatCurrency(amount: number, currency: string = 'PHP'): string {
  const symbol = currency === 'PHP' ? '₱' : currency === 'EUR' ? '€' : '$';
  return `${symbol}${amount.toFixed(2)}`;
}

export function todayISO(): string {
  return new Date().toISOString().split('T')[0]!;
}
