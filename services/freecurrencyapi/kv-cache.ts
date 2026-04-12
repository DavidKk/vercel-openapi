/**
 * Upstash Redis (KV) shared cache for exchange rates. Key = base currency (e.g. USD).
 * Fresh TTL is enforced on read via timestamp; Redis key uses a longer TTL so stale reads remain possible on upstream failure.
 */

import { getJsonKv, setJsonKvEx } from '@/services/kv/client'

/** Stored value: timestamp for application-level TTL, data is the exchange rate payload. */
export interface ExchangeRateCacheEntry {
  timestamp: number
  data: unknown
}

const KV_KEY_PREFIX = 'exchange-rate:v1:'

/** Redis key TTL (seconds). Longer than in-memory TTL so error-path stale reads can still succeed. */
const KV_ENTRY_TTL_SEC = 7 * 24 * 60 * 60

/**
 * Build the KV key for a base currency code.
 * @param baseCurrency Base currency (e.g. USD)
 * @returns Namespaced Redis key
 */
function buildKvKey(baseCurrency: string): string {
  return `${KV_KEY_PREFIX}${baseCurrency}`
}

/**
 * Read exchange rate from KV when the entry is younger than ttlMs (or any age when ttlMs is very large).
 *
 * @param baseCurrency Base currency code (e.g. USD)
 * @param ttlMs Maximum age in ms; use a large value to accept stale entries (e.g. on API error)
 * @returns Cache entry or undefined on miss, parse error, or when older than ttlMs
 */
export async function getCachedKv(baseCurrency: string, ttlMs: number): Promise<ExchangeRateCacheEntry | undefined> {
  const raw = await getJsonKv<ExchangeRateCacheEntry>(buildKvKey(baseCurrency))
  if (!raw || raw.data === undefined || raw.data === null || typeof raw.timestamp !== 'number') {
    return undefined
  }
  if (Date.now() - raw.timestamp >= ttlMs) {
    return undefined
  }
  return raw
}

/**
 * Store exchange rate in KV with Redis TTL. No-op when KV is not configured.
 *
 * @param baseCurrency Base currency code (e.g. USD)
 * @param entry Timestamp and rate payload
 */
export async function setCachedKv(baseCurrency: string, entry: ExchangeRateCacheEntry): Promise<void> {
  await setJsonKvEx(buildKvKey(baseCurrency), entry, KV_ENTRY_TTL_SEC)
}
