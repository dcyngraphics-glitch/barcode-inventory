import type { ExpiryStatus } from '@/types';

export interface StatusConfig {
  label: string;
  /** CSS custom-property reference; the browser resolves it at paint time. */
  bg: string;
  color: string;
}

/**
 * Expiry status presentation.
 *
 * The colours are the `--status-*` design tokens declared in src/index.css,
 * referenced rather than copied. This module used to carry its own hex literals
 * (`#dcfce7` / `#166534` …), which duplicated those tokens — and had already
 * drifted, so the "Good" badge text was `#166534` while the stylesheet said
 * `--status-good-text: #047857`. Two sources of truth, one of them wrong.
 *
 * The values are returned as `var(--status-…)` references, not resolved to hex:
 *
 *   - the stylesheet stays the single place a status colour is authored;
 *   - the reference resolves against the *active* theme, so the badges follow
 *     light/dark automatically without re-reading computed styles;
 *   - no Node builtin or file read is needed at runtime, so the module is safe
 *     to import from the browser bundle, jsdom, or a worker.
 */

/** Token each status resolves through. Declared here and in index.css only. */
const TOKEN_BY_STATUS: Record<ExpiryStatus, { bg: string; color: string }> = {
  good: { bg: 'var(--status-good-bg)', color: 'var(--status-good-text)' },
  expiring: { bg: 'var(--status-warning-bg)', color: 'var(--status-warning-text)' },
  expired: { bg: 'var(--status-expired-bg)', color: 'var(--status-expired-text)' },
};

export const STATUS_CONFIG: Record<ExpiryStatus, StatusConfig> = {
  good: { label: 'Good', ...TOKEN_BY_STATUS.good },
  expiring: { label: 'Expiring Soon', ...TOKEN_BY_STATUS.expiring },
  expired: { label: 'Expired', ...TOKEN_BY_STATUS.expired },
};

export function getStatusConfig(status: ExpiryStatus): StatusConfig {
  return STATUS_CONFIG[status];
}

/** The token names a status resolves through — for tests that verify them. */
export function statusTokenNames(status: ExpiryStatus): { bg: string; color: string } {
  return { ...TOKEN_BY_STATUS[status] };
}
