/** Local 'YYYY-MM-DD'. Never use toISOString() here — that is UTC and would
 *  push a late-evening sale into the next day. */
export function toDayKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
