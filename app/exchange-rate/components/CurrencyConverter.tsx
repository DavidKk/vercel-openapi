'use client'

import { useEffect, useState } from 'react'

import { getCachedExchangeRate } from '@/app/actions/exchange-rate/api'
import type { ExchangeRateData } from '@/app/actions/exchange-rate/types'
import { Spinner } from '@/components/Spinner'

import { CurrencyInput } from './CurrencyInput'

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

  return (
    <div>
      {error && (
        <div className="mb-4 rounded border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
          {error}
        </div>
      )}

      <div className="space-y-4">
        <div>
          <CurrencyInput
            value={amount}
            currencies={currencies}
            selectedCurrency={fromCurrency}
            onValueChange={handleTopAmountChange}
            onCurrencyChange={handleFromCurrencyChange}
            placeholder="Enter amount"
            onFocus={handleTopInputFocus}
          />
        </div>
        <div>
          <CurrencyInput
            value={result?.toString() || ''}
            currencies={currencies}
            selectedCurrency={toCurrency}
            onValueChange={handleBottomAmountChange}
            onCurrencyChange={handleToCurrencyChange}
            placeholder="Converted amount"
            onFocus={handleBottomInputFocus}
          />
        </div>
      </div>

      {loading && (
        <div className="mt-4 flex items-center justify-center text-xs text-gray-500">
          <Spinner />
          <span className="ml-2">Loading exchange rates...</span>
        </div>
      )}

      {result !== null && !loading && (
        <div className="mt-4 rounded-md border border-gray-200 bg-white px-4 py-3">
          <dl className="space-y-1 text-sm text-gray-700">
            <div className="flex justify-between gap-4">
              <dt className="text-gray-500">Result</dt>
              <dd className="font-medium">
                {parseFloat(amount || '0').toFixed(2)} {fromCurrency} = {result.toFixed(2)} {toCurrency}
              </dd>
            </div>
            {exchangeRates?.rates[toCurrency] != null && (
              <div className="flex justify-between gap-4 border-t border-gray-100 pt-2 text-xs text-gray-500">
                <dt>Rate</dt>
                <dd>
                  1 {fromCurrency} = {exchangeRates.rates[toCurrency]?.toFixed(4)} {toCurrency}
                </dd>
              </div>
            )}
          </dl>
        </div>
      )}
    </div>
  )
}
