import type { ExchangeRateData } from '@/app/actions/exchange-rate/types'

import { CACHE_DURATION_MS } from './constants'

/** In-memory cache entry for exchange rate data */
interface MemoryCacheEntry {
  data: ExchangeRateData | null
  timestamp: number
}

/** Memory cache storage for exchange rates */
const MEMORY_CACHE: MemoryCacheEntry = {
  data: null,
  timestamp: 0,
}

/**
 * Clear the in-memory exchange rate cache
 */
export function clearExchangeRateCache(): void {
  MEMORY_CACHE.data = null
  MEMORY_CACHE.timestamp = 0
}

/**
 * Get cached exchange rate data if present and not expired
 * @param baseCurrency Base currency code to match (e.g. 'USD')
 * @returns Cached ExchangeRateData or null if miss/expired
 */
export function getCachedRate(baseCurrency: string): ExchangeRateData | null {
  const now = Date.now()
  if (MEMORY_CACHE.data && MEMORY_CACHE.data.base === baseCurrency && now - MEMORY_CACHE.timestamp < CACHE_DURATION_MS) {
    return MEMORY_CACHE.data
  }
  return null
}

/**
 * Store exchange rate data in memory cache
 * @param data Exchange rate data to cache
 */
export function setCachedRate(data: ExchangeRateData): void {
  MEMORY_CACHE.data = data
  MEMORY_CACHE.timestamp = Date.now()
}
