import { getCachedExchangeRate } from '@/app/actions/exchange-rate/api'
import type { ExchangeRateData } from '@/app/actions/exchange-rate/types'

import { CurrencyConverter } from './CurrencyConverter'

interface ExchangeRateServerProps {
  initialBaseCurrency?: string
}

// Convert base currency to currency options
function getCurrencyOptions(exchangeRates: ExchangeRateData): string[] {
  const uniqueCurrencies = new Set([exchangeRates.base, ...Object.keys(exchangeRates.rates)])
  return Array.from(uniqueCurrencies).sort()
}

export default async function ExchangeRateServer({ initialBaseCurrency = 'USD' }: ExchangeRateServerProps) {
  let initialExchangeRates: ExchangeRateData | null = null
  let initialError: string | null = null

  try {
    initialExchangeRates = await getCachedExchangeRate(initialBaseCurrency)
  } catch (err) {
    initialError = err instanceof Error ? err.message : 'An unknown error occurred'
  }

  // Convert base currency to currency options
  const currencyOptions = initialExchangeRates ? getCurrencyOptions(initialExchangeRates) : []

  return (
    <div className="max-w-4xl mx-auto p-4">
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Exchange Rates</h1>
        <p className="text-gray-600">Latest exchange rates</p>
        {initialExchangeRates && <p className="text-sm text-gray-500 mt-2">Last updated: {new Date(initialExchangeRates.date).toLocaleString()}</p>}
      </div>

      {initialError ? (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
          <strong className="font-bold">Error: </strong>
          <span className="block sm:inline">{initialError}</span>
        </div>
      ) : initialExchangeRates ? (
        <CurrencyConverter currencies={currencyOptions} initialExchangeRates={initialExchangeRates} />
      ) : (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      )}
    </div>
  )
}
