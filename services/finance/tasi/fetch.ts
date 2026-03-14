/**
 * Fetch today's finance (TASI) data from cf-feed-bridge. Used for read (today) and cron ingest.
 * In-memory cache with TTL to avoid hammering the bridge during dev/refresh.
 */

import { createLogger } from '@/services/logger'

import type { TasiCompanyDailyRecord, TasiMarketSummary } from './types'

const logger = createLogger('finance-tasi-fetch')

/** TTL for in-memory cache (ms). 60s to reduce requests during development. */
const TASI_BRIDGE_CACHE_MS = 60 * 1000

interface CacheEntry<T> {
  value: T
  expires: number
}

let companyCache: CacheEntry<TasiCompanyDailyRecord[]> | null = null
let summaryCache: CacheEntry<TasiMarketSummary> | null = null

function isExpired<T>(entry: CacheEntry<T> | null): boolean {
  return entry == null || Date.now() >= entry.expires
}

/** Base URL of TASI feed (cf-feed-bridge). Set TASI_FEED_URL in env. */
function getTasiFeedBaseUrl(): string {
  const url = process.env.TASI_FEED_URL
  if (!url) throw new Error('TASI_FEED_URL is not set')
  return url.replace(/\/$/, '')
}

/**
 * Fetch company daily (today) from cf-feed-bridge.
 * Results are cached in memory for TASI_BRIDGE_CACHE_MS to reduce repeated requests.
 *
 * @returns Company daily records
 */
/** cf-feed-bridge may wrap response as { code, success, data, message }. We accept either raw array or data. */
export async function fetchCompanyDailyFromBridge(): Promise<TasiCompanyDailyRecord[]> {
  if (!isExpired(companyCache)) {
    logger.info('company daily: in-memory cache hit', { count: companyCache!.value.length })
    return companyCache!.value
  }
  const base = getTasiFeedBaseUrl()
  logger.info('company daily: in-memory cache miss, fetching from bridge', { url: `${base}/api/finance/tasi/company/daily` })
  const res = await fetch(`${base}/api/finance/tasi/company/daily`)
  if (!res.ok) {
    logger.fail('company daily: bridge failed', { status: res.status })
    throw new Error(`cf-feed-bridge company/daily failed: ${res.status}`)
  }
  const body = (await res.json()) as TasiCompanyDailyRecord[] | { data?: TasiCompanyDailyRecord[] }
  const data = Array.isArray(body) ? body : body?.data
  if (!Array.isArray(data)) {
    logger.fail('company daily: invalid response')
    throw new Error('cf-feed-bridge company/daily did not return array')
  }
  companyCache = { value: data, expires: Date.now() + TASI_BRIDGE_CACHE_MS }
  logger.info('company daily: fetched', { count: data.length })
  return data
}

/**
 * Fetch market summary (today) from cf-feed-bridge.
 * Results are cached in memory for TASI_BRIDGE_CACHE_MS to reduce repeated requests.
 *
 * @returns Market summary
 */
/** cf-feed-bridge may wrap response as { code, success, data, message }. We accept either raw object or data. */
export async function fetchSummaryFromBridge(): Promise<TasiMarketSummary> {
  if (!isExpired(summaryCache)) {
    logger.info('summary daily: in-memory cache hit')
    return summaryCache!.value
  }
  const base = getTasiFeedBaseUrl()
  logger.info('summary daily: in-memory cache miss, fetching from bridge', { url: `${base}/api/finance/tasi/summary/daily` })
  const res = await fetch(`${base}/api/finance/tasi/summary/daily`)
  if (!res.ok) {
    logger.fail('summary daily: bridge failed', { status: res.status })
    throw new Error(`cf-feed-bridge summary/daily failed: ${res.status}`)
  }
  const body = (await res.json()) as TasiMarketSummary | { data?: TasiMarketSummary }
  const data = body != null && typeof body === 'object' && 'data' in body && (body as { data?: TasiMarketSummary }).data != null ? (body as { data: TasiMarketSummary }).data : body
  if (!data || typeof data !== 'object') {
    logger.fail('summary daily: invalid response')
    throw new Error('cf-feed-bridge summary/daily invalid')
  }
  summaryCache = { value: data as TasiMarketSummary, expires: Date.now() + TASI_BRIDGE_CACHE_MS }
  logger.info('summary daily: fetched', { date: (data as TasiMarketSummary).date })
  return data as TasiMarketSummary
}
