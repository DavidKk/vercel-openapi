'use client'

interface CurrencyInputProps {
  value: string
  currencies: string[]
  selectedCurrency: string
  onValueChange: (value: string) => void
  onCurrencyChange: (currency: string) => void
  placeholder?: string
  onFocus?: () => void
}

export function CurrencyInput({ value, currencies, selectedCurrency, onValueChange, onCurrencyChange, placeholder = 'Enter amount', onFocus }: CurrencyInputProps) {
  return (
    <div className="flex border border-gray-300 rounded-md shadow-sm focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500">
      <input
        type="number"
        value={value}
        onChange={(e) => onValueChange(e.target.value)}
        onFocus={onFocus}
        placeholder={placeholder}
        className="flex-1 px-3 py-2 border-0 rounded-l-md focus:outline-none focus:ring-0"
        min="0"
        step="0.01"
      />
      <select value={selectedCurrency} onChange={(e) => onCurrencyChange(e.target.value)} className="px-2 py-2 border-0 rounded-r-md focus:outline-none focus:ring-0 bg-white">
        {currencies.map((currency) => (
          <option key={currency} value={currency}>
            {currency}
          </option>
        ))}
      </select>
    </div>
  )
}
