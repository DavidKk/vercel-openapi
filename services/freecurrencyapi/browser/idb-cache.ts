/**
 * Browser-only IndexedDB cache for exchange rate API responses.
 * Key = base currency (e.g. USD). TTL 5 min (align with server L1/L2).
 * Do not import from API routes or server code (no window).
 */

import type { ExchangeRateData } from '@/app/actions/exchange-rate/types'
import { createIdbCache, IDB_STORES, SHARED_DB_NAME } from '@/services/idb-cache'

/** TTL 5 minutes (align with server CACHE_DURATION_MS). */
const TTL_MS = 5 * 60 * 1000

const idbCache = createIdbCache<ExchangeRateData>(SHARED_DB_NAME, IDB_STORES.RATES, TTL_MS)

/**
 * Get cached exchange rate from IndexedDB by base currency. Returns null on miss or when past TTL.
 *
 * @param baseCurrency Base currency code (e.g. USD)
 * @returns Cached exchange rate data or null
 */
export async function getExchangeRateFromIdb(baseCurrency: string): Promise<ExchangeRateData | null> {
  return idbCache.get(baseCurrency)
}

/**
 * Store exchange rate in IndexedDB. Call after a successful API response.
 *
 * @param baseCurrency Base currency code (e.g. USD)
 * @param data Exchange rate data from API
 */
export async function setExchangeRateInIdb(baseCurrency: string, data: ExchangeRateData): Promise<void> {
  await idbCache.set(baseCurrency, data)
}
