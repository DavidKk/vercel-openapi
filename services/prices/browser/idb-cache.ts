import type { ProductType } from '@/app/actions/prices/product'
import { createIdbCache, IDB_STORES, SHARED_DB_NAME } from '@/services/idb-cache'

export interface PricesOverviewCachePayload {
  products: ProductType[]
  cachedAt: number
}

const PRICES_OVERVIEW_TTL_MS = 10 * 60 * 1000
const overviewCache = createIdbCache<PricesOverviewCachePayload>(SHARED_DB_NAME, IDB_STORES.PRICES, PRICES_OVERVIEW_TTL_MS)

/**
 * Get cached prices overview payload from IndexedDB.
 * @param key Cache key
 * @returns Cached payload or null
 */
export async function getPricesOverviewFromIdb(key: string): Promise<PricesOverviewCachePayload | null> {
  return overviewCache.get(key)
}

/**
 * Store prices overview payload into IndexedDB.
 * @param key Cache key
 * @param payload Payload to cache
 */
export async function setPricesOverviewInIdb(key: string, payload: PricesOverviewCachePayload): Promise<void> {
  await overviewCache.set(key, payload)
}
