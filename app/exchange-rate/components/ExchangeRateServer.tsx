import { getCachedExchangeRate } from '@/app/actions/exchange-rate/api'
import type { ExchangeRateData } from '@/app/actions/exchange-rate/types'
import { CONTENT_HEADER_CLASS } from '@/app/Nav/constants'
import { Spinner } from '@/components/Spinner'

import { CurrencyConverter } from './CurrencyConverter'

interface ExchangeRateServerProps {
  initialBaseCurrency?: string
}

/** Build sorted list of currencies from exchange rate data */
function getCurrencyOptions(exchangeRates: ExchangeRateData): string[] {
  const uniqueCurrencies = new Set([exchangeRates.base, ...Object.keys(exchangeRates.rates)])
  return Array.from(uniqueCurrencies).sort()
}

/**
 * Exchange rate overview: toolbar + currency converter. Used inside /exchange-rate layout.
 */
export default async function ExchangeRateServer({ initialBaseCurrency = 'USD' }: ExchangeRateServerProps) {
  let initialExchangeRates: ExchangeRateData | null = null
  let initialError: string | null = null

  try {
    initialExchangeRates = await getCachedExchangeRate(initialBaseCurrency)
  } catch (err) {
    initialError = err instanceof Error ? err.message : 'An unknown error occurred'
  }

  const currencyOptions = initialExchangeRates ? getCurrencyOptions(initialExchangeRates) : []
  const latestUpdated = initialExchangeRates ? new Date(initialExchangeRates.date).toLocaleString() : ''

  return (
    <div className="flex h-full min-h-0 w-full flex-col bg-white">
      <div className={`${CONTENT_HEADER_CLASS} text-sm text-gray-600`}>
        <span>Exchange rates</span>
      </div>

      <div className="min-h-0 flex-1 overflow-auto">
        {initialError ? (
          <div className="mx-auto max-w-2xl p-4">
            <div className="rounded border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
              {initialError}
            </div>
          </div>
        ) : initialExchangeRates ? (
          <div className="mx-auto max-w-2xl p-4">
            <CurrencyConverter currencies={currencyOptions} initialExchangeRates={initialExchangeRates} />
          </div>
        ) : (
          <div className="flex h-48 items-center justify-center">
            <Spinner />
          </div>
        )}
      </div>

      {latestUpdated && (
        <div className="flex shrink-0 items-center justify-end border-t border-gray-200 px-4 py-1.5 text-xs text-gray-500">
          <span>Last updated: {latestUpdated}</span>
        </div>
      )}
    </div>
  )
}
