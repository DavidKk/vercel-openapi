'use client'

import { FormSelect } from '@/components/FormSelect'

interface CurrencyInputProps {
  value: string
  currencies: string[]
  selectedCurrency: string
  onValueChange: (value: string) => void
  onCurrencyChange: (currency: string) => void
  placeholder?: string
  onFocus?: () => void
}

/**
 * Combined amount input + currency select. Styling matches fuel-price form controls (h-8, border-gray-300).
 */
export function CurrencyInput({ value, currencies, selectedCurrency, onValueChange, onCurrencyChange, placeholder = 'Enter amount', onFocus }: CurrencyInputProps) {
  const options = currencies.map((c) => ({ value: c, label: c }))

  return (
    <div className="flex overflow-hidden rounded-md border border-gray-300 bg-white focus-within:border-gray-500 focus-within:ring-1 focus-within:ring-gray-500">
      <input
        type="number"
        value={value}
        onChange={(e) => onValueChange(e.target.value)}
        onFocus={onFocus}
        placeholder={placeholder}
        className="h-8 min-w-0 flex-1 border-0 bg-transparent px-2.5 text-sm text-gray-900 outline-none focus:ring-0"
        min={0}
        step={0.01}
      />
      <div className="min-w-[5rem] border-l border-gray-300">
        <FormSelect value={selectedCurrency} onChange={onCurrencyChange} options={options} className="rounded-none border-0 bg-transparent focus:ring-0" />
      </div>
    </div>
  )
}
