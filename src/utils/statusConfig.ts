import type { ExpiryStatus } from '@/types';

export interface StatusConfig {
  label: string;
  bg: string;
  color: string;
}

export const STATUS_CONFIG: Record<ExpiryStatus, StatusConfig> = {
  good: { label: 'Good', bg: '#dcfce7', color: '#166534' },
  expiring: { label: 'Expiring', bg: '#fef3c7', color: '#92400e' },
  expired: { label: 'Expired', bg: '#fee2e2', color: '#991b1b' },
};

export function getStatusConfig(status: ExpiryStatus): StatusConfig {
  return STATUS_CONFIG[status];
}
