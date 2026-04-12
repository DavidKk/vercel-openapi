import type { ConversionRequest, CurrencyConversion, ExchangeRateData } from '@/app/actions/exchange-rate/types'

import { getCachedRate, setCachedRate } from './cache'
import { getExchangeRate } from './client'
import { CACHE_DURATION_MS } from './constants'
import { convertWithRates } from './convert'
import { getCachedKv, setCachedKv } from './kv-cache'

export { clearExchangeRateCache } from './cache'
export { getExchangeRate } from './client'

/**
 * Get exchange rate with L1 (in-memory LRU) and shared KV (Upstash Redis).
 * Flow: L1 → KV → API; on success writes KV then L1. On error returns stale from L1 or KV if available.
 *
 * @param baseCurrency Base currency code (e.g. 'USD')
 * @returns Promise resolving to exchange rate data
 */
export async function getCachedExchangeRate(baseCurrency = 'USD'): Promise<ExchangeRateData> {
  const fromL1 = getCachedRate(baseCurrency)
  if (fromL1) return fromL1

  const fromKv = await getCachedKv(baseCurrency, CACHE_DURATION_MS)
  if (fromKv?.data) return fromKv.data as ExchangeRateData

  try {
    const fresh = await getExchangeRate(baseCurrency)
    const entry = { timestamp: Date.now(), data: fresh }
    await setCachedKv(baseCurrency, entry)
    setCachedRate(baseCurrency, fresh)
    return fresh
  } catch (error) {
    const staleL1 = getCachedRate(baseCurrency)
    if (staleL1) return staleL1
    const staleKv = await getCachedKv(baseCurrency, Number.MAX_SAFE_INTEGER)
    if (staleKv?.data) return staleKv.data as ExchangeRateData
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
