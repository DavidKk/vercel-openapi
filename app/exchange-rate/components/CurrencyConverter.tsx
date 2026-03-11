'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { TbArrowsExchange, TbChevronDown } from 'react-icons/tb'

import { getCachedExchangeRate } from '@/app/actions/exchange-rate/api'
import type { ExchangeRateData } from '@/app/actions/exchange-rate/types'
import { Spinner } from '@/components/Spinner'
import { fuzzySearch } from '@/utils/find'

/** Allow only digits and one decimal point */
function formatAmountInput(value: string): string {
  const hasDot = value.includes('.')
  const filtered = value.replace(/[^\d.]/g, '')
  if (hasDot) {
    const [head, ...tail] = filtered.split('.')
    return tail.length > 0 ? `${head}.${tail.join('')}` : head || ''
  }
  return filtered
}

/**
 * Private: one row combining amount input (text, no number spinner) + currency dropdown with search.
 */
interface AmountCurrencyRowProps {
  amountValue: string
  currencyValue: string
  currencyOptions: { value: string; label: string }[]
  onAmountChange: (value: string) => void
  onCurrencyChange: (value: string) => void
  onAmountFocus?: () => void
  placeholder?: string
}

function AmountCurrencyRow({ amountValue, currencyValue, currencyOptions, onAmountChange, onCurrencyChange, onAmountFocus, placeholder = '0' }: AmountCurrencyRowProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) setSearch('')
  }, [open])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const filtered = search.trim() === '' ? currencyOptions : currencyOptions.filter((opt) => fuzzySearch(search.trim(), opt.label))
  const selectedLabel = currencyOptions.find((o) => o.value === currencyValue)?.label ?? currencyValue

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onAmountChange(formatAmountInput(e.target.value))
  }

  return (
    <div className="flex items-center gap-3 overflow-visible rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm">
      <input
        type="text"
        inputMode="decimal"
        value={amountValue}
        onChange={handleAmountChange}
        onFocus={onAmountFocus}
        placeholder={placeholder}
        className="min-w-0 flex-1 border-0 bg-transparent text-2xl font-light tabular-nums text-gray-900 outline-none placeholder:text-gray-300"
      />
      <div ref={containerRef} className="relative shrink-0">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="flex h-9 min-w-[5rem] items-center justify-between gap-1.5 border-0 bg-transparent px-2 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-md"
        >
          <span>{selectedLabel}</span>
          <TbChevronDown className={`h-4 w-4 shrink-0 text-gray-500 transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>
        {open && (
          <div className="absolute top-full right-0 z-10 mt-1 max-h-56 w-56 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search currency..."
              className="w-full border-0 border-b border-gray-100 bg-gray-50 px-3 py-2 text-sm text-gray-900 outline-none placeholder:text-gray-400"
            />
            <ul className="max-h-44 overflow-y-auto py-1" data-testid="currency-options-list">
              {filtered.length === 0 ? (
                <li className="px-3 py-2 text-xs text-gray-500">No match</li>
              ) : (
                filtered.map((opt) => (
                  <li key={opt.value}>
                    <button
                      type="button"
                      onClick={() => {
                        onCurrencyChange(opt.value)
                        setOpen(false)
                      }}
                      className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-100 ${opt.value === currencyValue ? 'bg-gray-100 font-medium text-gray-900' : 'text-gray-700'}`}
                    >
                      {opt.label}
                    </button>
                  </li>
                ))
              )}
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}

export interface CurrencyConverterProps {
  /** Available currencies for conversion */
  currencies: string[]
  /** Initial exchange rates data */
  initialExchangeRates?: ExchangeRateData
}

export function CurrencyConverter({ currencies, initialExchangeRates }: CurrencyConverterProps) {
  const [fromCurrency, setFromCurrency] = useState('USD')
  const [toCurrency, setToCurrency] = useState('CNY')
  const [amount, setAmount] = useState('100')
  const [result, setResult] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [exchangeRates, setExchangeRates] = useState<ExchangeRateData | null>(initialExchangeRates || null)
  const [activeInput, setActiveInput] = useState<'top' | 'bottom' | null>(null)

  useEffect(() => {
    if (activeInput === 'bottom') return

    const fetchExchangeRates = async () => {
      if (!fromCurrency) return

      setLoading(true)
      setError(null)

      try {
        const rates = await getCachedExchangeRate(fromCurrency)
        setExchangeRates(rates)
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to fetch exchange rates'
        setError(errorMessage)
      } finally {
        setLoading(false)
      }
    }

    fetchExchangeRates()
  }, [fromCurrency, activeInput])

  useEffect(() => {
    if (activeInput === 'bottom' || !exchangeRates || !amount || isNaN(parseFloat(amount))) {
      return
    }

    const amountValue = parseFloat(amount)
    if (isNaN(amountValue)) {
      return
    }

    if (fromCurrency === toCurrency) {
      setResult(amountValue)
      return
    }

    if (exchangeRates.rates[toCurrency]) {
      const rate = exchangeRates.rates[toCurrency]
      const converted = parseFloat((amountValue * rate).toFixed(2))
      setResult(converted)
    }
  }, [amount, fromCurrency, toCurrency, exchangeRates, activeInput])

  const handleTopAmountChange = (value: string) => {
    setActiveInput('top')
    setAmount(value)

    if (!value || isNaN(parseFloat(value)) || !exchangeRates) {
      setResult(null)
      return
    }

    const amountValue = parseFloat(value)
    if (isNaN(amountValue)) {
      setResult(null)
      return
    }

    if (fromCurrency === toCurrency) {
      setResult(amountValue)
      return
    }

    if (exchangeRates.rates[toCurrency]) {
      const rate = exchangeRates.rates[toCurrency]
      const converted = parseFloat((amountValue * rate).toFixed(2))
      setResult(converted)
    }
  }

  const handleBottomAmountChange = (value: string) => {
    setActiveInput('bottom')
    setResult(value ? parseFloat(value) : null)

    if (!value || isNaN(parseFloat(value)) || !exchangeRates) {
      return
    }

    const reverseAmountValue = parseFloat(value)
    if (isNaN(reverseAmountValue)) {
      return
    }

    if (fromCurrency === toCurrency) {
      setAmount(reverseAmountValue.toString())
    } else if (exchangeRates.rates[toCurrency]) {
      const rate = exchangeRates.rates[toCurrency]
      const converted = parseFloat((reverseAmountValue / rate).toFixed(2))
      setAmount(converted.toString())
    }
  }

  const handleFromCurrencyChange = (currency: string) => {
    setActiveInput('top')
    setFromCurrency(currency)
  }

  const handleToCurrencyChange = (currency: string) => {
    setActiveInput('bottom')
    setToCurrency(currency)

    if (!amount || isNaN(parseFloat(amount)) || !exchangeRates) {
      setResult(null)
      return
    }

    const amountValue = parseFloat(amount)
    if (isNaN(amountValue)) {
      setResult(null)
      return
    }

    if (fromCurrency === currency) {
      setResult(amountValue)
      return
    }

    if (exchangeRates.rates[currency]) {
      const rate = exchangeRates.rates[currency]
      const converted = parseFloat((amountValue * rate).toFixed(2))
      setResult(converted)
    }
  }

  const handleTopInputFocus = () => setActiveInput('top')
  const handleBottomInputFocus = () => setActiveInput('bottom')

  const handleSwap = useCallback(() => {
    setFromCurrency(() => toCurrency)
    setToCurrency(() => fromCurrency)
    setActiveInput('top')
  }, [fromCurrency, toCurrency])

  useEffect(() => {
    if (!exchangeRates || activeInput === 'bottom') return

    const amountValue = parseFloat(amount)
    if (isNaN(amountValue)) {
      return
    }

    if (fromCurrency === toCurrency) {
      setResult(amountValue)
      return
    }

    if (exchangeRates.rates[toCurrency]) {
      const rate = exchangeRates.rates[toCurrency]
      const converted = parseFloat((amountValue * rate).toFixed(2))
      setResult(converted)
    }
  }, [exchangeRates, activeInput])

  const currencyOptions = currencies.map((c) => ({ value: c, label: c }))
  const rate = exchangeRates?.rates[toCurrency]
  const rateText = rate != null && fromCurrency !== toCurrency ? `1 ${fromCurrency} = ${Number(rate).toFixed(4)} ${toCurrency}` : null

  return (
    <div className="mx-auto max-w-md">
      {error && (
        <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
          {error}
        </div>
      )}

      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="space-y-3">
          <div data-testid="converter-row-from">
            <AmountCurrencyRow
              amountValue={amount}
              currencyValue={fromCurrency}
              currencyOptions={currencyOptions}
              onAmountChange={handleTopAmountChange}
              onCurrencyChange={handleFromCurrencyChange}
              onAmountFocus={handleTopInputFocus}
              placeholder="0"
            />
          </div>

          <div className="flex items-center justify-center gap-3 py-1">
            {loading ? (
              <span className="flex items-center gap-2 text-xs text-gray-500">
                <Spinner />
                Loading…
              </span>
            ) : rateText ? (
              <span className="text-xs text-gray-500">{rateText}</span>
            ) : (
              <span className="text-xs text-gray-400">—</span>
            )}
            <button
              type="button"
              onClick={handleSwap}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-500 shadow-sm transition-colors hover:bg-gray-50 hover:text-gray-700"
              aria-label="Swap currencies"
            >
              <TbArrowsExchange className="h-5 w-5" />
            </button>
          </div>

          <div data-testid="converter-row-to">
            <AmountCurrencyRow
              amountValue={result != null ? result.toString() : ''}
              currencyValue={toCurrency}
              currencyOptions={currencyOptions}
              onAmountChange={(v) => handleBottomAmountChange(v)}
              onCurrencyChange={handleToCurrencyChange}
              onAmountFocus={handleBottomInputFocus}
              placeholder="0"
            />
          </div>
        </div>
      </div>
    </div>
  )
}
