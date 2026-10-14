import { useSettings } from '@/hooks/useSettings'

export const ModeIndicatorChip = ({ mode = 'default' }: { mode?: 'default' | 'cashier' | 'seller' }) => {
  const { cashierMode, sellerMode } = useSettings()
  const activeMode = cashierMode ? 'cashier' : sellerMode ? 'seller' : 'default'

  const modeConfigs = {
    default: { label: 'Standard', bg: 'bg-gray-100', text: 'text-gray-800' },
    cashier: { label: 'Cashier', bg: 'bg-green-100', text: 'text-green-800' },
    seller: { label: 'Seller', bg: 'bg-blue-100', text: 'text-blue-800' },
  }

  const config = modeConfigs[activeMode]

  return (
    <span className={`px-3 py-1 rounded text-xs font-medium ${config.bg} ${config.text}`}>
      {config.label}
    </span>
  )
}