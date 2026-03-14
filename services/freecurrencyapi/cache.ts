import type { ExchangeRateData } from '@/app/actions/exchange-rate/types'
import { createLruCache } from '@/services/lru-cache'

import { CACHE_DURATION_MS } from './constants'

/** In-memory L1 cache entry: timestamp for TTL, data for response. */
interface MemoryCacheEntry {
  timestamp: number
  data: ExchangeRateData
}

/** Max L1 entries (one per base currency). LRU eviction when full. */
const L1_MAX_SIZE = 100

const state: { lru: ReturnType<typeof createLruCache<string, MemoryCacheEntry>> } = {
  lru: createLruCache<string, MemoryCacheEntry>(L1_MAX_SIZE),
}

/**
 * Clear the in-memory exchange rate cache (L1).
 */
export function clearExchangeRateCache(): void {
  state.lru = createLruCache<string, MemoryCacheEntry>(L1_MAX_SIZE)
}

/**
 * Get cached exchange rate from L1 if present and not expired.
 *
 * @param baseCurrency Base currency code (e.g. 'USD')
 * @returns Cached ExchangeRateData or null on miss/expired
 */
export function getCachedRate(baseCurrency: string): ExchangeRateData | null {
  const entry = state.lru.get(baseCurrency)
  if (!entry) return null
  if (Date.now() - entry.timestamp >= CACHE_DURATION_MS) return null
  return entry.data
}

/**
 * Store exchange rate in L1. Key = base currency.
 *
 * @param baseCurrency Base currency code (e.g. 'USD')
 * @param data Exchange rate data to cache
 */
export function setCachedRate(baseCurrency: string, data: ExchangeRateData): void {
  state.lru.set(baseCurrency, { timestamp: Date.now(), data })
}
