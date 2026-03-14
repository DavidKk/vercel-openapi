import type { ConversionRequest, CurrencyConversion, ExchangeRateData } from '@/app/actions/exchange-rate/types'

import { getCachedRate, setCachedRate } from './cache'
import { getExchangeRate } from './client'
import { convertWithRates } from './convert'

export { clearExchangeRateCache } from './cache'
export { getExchangeRate } from './client'

/**
 * Get exchange rate data with in-memory caching
 * @param baseCurrency Base currency code (e.g. 'USD')
 * @returns Promise resolving to exchange rate data
 */
export async function getCachedExchangeRate(baseCurrency = 'USD'): Promise<ExchangeRateData> {
  const cached = getCachedRate(baseCurrency)
  if (cached) return cached

  try {
    const fresh = await getExchangeRate(baseCurrency)
    setCachedRate(fresh)
    return fresh
  } catch (error) {
    const stale = getCachedRate(baseCurrency)
    if (stale) return stale
    throw error
  }
}

/**
 * Convert currency amount from one currency to another
 * @param request Conversion request (from, to, amount)
 * @returns Promise resolving to conversion result
 */
export async function convertCurrency(request: ConversionRequest): Promise<CurrencyConversion> {
  const rates = await getCachedExchangeRate(request.from)
  return convertWithRates(request, rates)
}
