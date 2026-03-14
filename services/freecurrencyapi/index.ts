import type { ConversionRequest, CurrencyConversion, ExchangeRateData } from '@/app/actions/exchange-rate/types'

import { getCachedRate, setCachedRate } from './cache'
import { getExchangeRate } from './client'
import { CACHE_DURATION_MS } from './constants'
import { convertWithRates } from './convert'
import { getCachedTurso, setCachedTurso } from './turso-cache'

export { clearExchangeRateCache } from './cache'
export { getExchangeRate } from './client'

/**
 * Get exchange rate with L1 (in-memory LRU) and L2 (Turso) caching.
 * Flow: L1 → L2 → API; on success writes L2 then L1. On error returns stale from L1 or L2 if available.
 *
 * @param baseCurrency Base currency code (e.g. 'USD')
 * @returns Promise resolving to exchange rate data
 */
export async function getCachedExchangeRate(baseCurrency = 'USD'): Promise<ExchangeRateData> {
  const fromL1 = getCachedRate(baseCurrency)
  if (fromL1) return fromL1

  const fromL2 = await getCachedTurso(baseCurrency, CACHE_DURATION_MS)
  if (fromL2?.data) return fromL2.data as ExchangeRateData

  try {
    const fresh = await getExchangeRate(baseCurrency)
    const entry = { timestamp: Date.now(), data: fresh }
    await setCachedTurso(baseCurrency, entry)
    setCachedRate(baseCurrency, fresh)
    return fresh
  } catch (error) {
    const staleL1 = getCachedRate(baseCurrency)
    if (staleL1) return staleL1
    const staleL2 = await getCachedTurso(baseCurrency, Number.MAX_SAFE_INTEGER)
    if (staleL2?.data) return staleL2.data as ExchangeRateData
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
