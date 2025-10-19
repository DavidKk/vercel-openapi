'use client'

import { useEffect, useState } from 'react'

import { getCachedExchangeRate } from '@/app/actions/exchange-rate/api'
import type { ExchangeRateData } from '@/app/actions/exchange-rate/types'
import { Spinner } from '@/components/Spinner'

import { CurrencyInput } from './components/CurrencyInput'

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

  // Fetch exchange rates when fromCurrency changes
  useEffect(() => {
    // Only fetch when top input is active or no input is active (initial load)
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

  // Calculate result when amount, fromCurrency, toCurrency, or exchangeRates change
  // But only when top input is active or no input is active
  useEffect(() => {
    if (activeInput === 'bottom' || !exchangeRates || !amount || isNaN(parseFloat(amount))) {
      // If bottom input is active, we don't want to update result from top input changes
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

  // Handle amount change for the top input (forward conversion)
  const handleTopAmountChange = (value: string) => {
    setActiveInput('top')
    setAmount(value)

    // Immediately calculate result when top input changes
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

  // Handle amount change for the bottom input (reverse conversion using existing rates)
  const handleBottomAmountChange = (value: string) => {
    setActiveInput('bottom')
    setResult(value ? parseFloat(value) : null)

    // Immediately calculate amount when bottom input changes
    if (!value || isNaN(parseFloat(value)) || !exchangeRates) {
      return
    }

    const reverseAmountValue = parseFloat(value)
    if (isNaN(reverseAmountValue)) {
      return
    }

    // Use existing exchange rates for reverse calculation
    if (fromCurrency === toCurrency) {
      setAmount(reverseAmountValue.toString())
    } else if (exchangeRates.rates[toCurrency]) {
      // Reverse calculation: if 1 USD = X CNY, then 1 CNY = 1/X USD
      const rate = exchangeRates.rates[toCurrency]
      const converted = parseFloat((reverseAmountValue / rate).toFixed(2))
      setAmount(converted.toString())
    }
  }

  // Handle currency change for the top input
  const handleFromCurrencyChange = (currency: string) => {
    // When changing currency in top input, we want to fetch new rates
    setActiveInput('top') // Set active input to top
    setFromCurrency(currency)
  }

  // Handle currency change for the bottom input
  const handleToCurrencyChange = (currency: string) => {
    // When changing currency in bottom input, we still want to update the calculation
    setActiveInput('bottom') // Set active input to bottom
    setToCurrency(currency)

    // Immediately recalculate when toCurrency changes
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

  // Reset active input when user focuses on top input
  const handleTopInputFocus = () => {
    setActiveInput('top')
  }

  // Reset active input when user focuses on bottom input
  const handleBottomInputFocus = () => {
    setActiveInput('bottom')
  }

  // Calculate initial result when component mounts and we have exchange rates
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
    <div className="mb-8">
      {error && <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">Error: {error}</div>}

      <div className="space-y-4 mb-4">
        {/* Top Currency Input - From Currency */}
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

        {/* Bottom Currency Input - To Currency */}
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
        <div className="flex justify-center my-4">
          <Spinner />
          <span className="ml-2">Loading exchange rates...</span>
        </div>
      )}

      {result !== null && !loading && (
        <div className="bg-blue-50 rounded-lg p-4 mt-4">
          <div className="text-lg font-bold text-center">
            {parseFloat(amount || '0').toFixed(2)} {fromCurrency} = {result.toFixed(2)} {toCurrency}
          </div>
          {exchangeRates && (
            <div className="text-sm text-center text-gray-500 mt-1">
              1 {fromCurrency} = {exchangeRates.rates[toCurrency]?.toFixed(4) || 'N/A'} {toCurrency}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
