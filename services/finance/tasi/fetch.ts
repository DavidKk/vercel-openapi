/**
 * Fetch today's finance (TASI) data from cf-feed-bridge. Used for read (today) and cron ingest.
 * In-memory cache with TTL to avoid hammering the bridge during dev/refresh.
 */

import { createLogger } from '@/services/logger'

import type { TasiCompanyDailyRecord, TasiMarketSummary } from './types'

const logger = createLogger('finance-tasi-fetch')

/**
 * Paths on **cf-feed-bridge** (Worker). Bridge uses `/api/finance/tasi/*`; this app’s Next routes use `/api/finance/market/*` as the public API.
 */
const BRIDGE_COMPANY_DAILY_PATH = '/api/finance/tasi/company/daily'
const BRIDGE_SUMMARY_DAILY_PATH = '/api/finance/tasi/summary/daily'

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
 * Build request headers for cf-feed-bridge calls.
 * Preferred env:
 * - TASI_FEED_REQUEST_HEADERS_JSON (JSON object, e.g. {"x-api-key":"...","x-internal-call":"vercel"})
 *
 * Legacy envs (backward compatible):
 * - TASI_FEED_X_API_KEY_HEADER_KEY / TASI_FEED_X_API_KEY_HEADER_VALUE
 * - TASI_FEED_X_INTERNAL_CALL_HEADER_KEY / TASI_FEED_X_INTERNAL_CALL_HEADER_VALUE
 */
function buildBridgeHeaders(): Headers {
  const headers = new Headers({ Accept: 'application/json' })
  const headersJson = process.env.TASI_FEED_REQUEST_HEADERS_JSON?.trim()
  if (headersJson) {
    try {
      const parsed = JSON.parse(headersJson) as Record<string, unknown>
      for (const [key, value] of Object.entries(parsed)) {
        const k = key.trim()
        const v = typeof value === 'string' ? value.trim() : String(value ?? '').trim()
        if (k && v) headers.set(k, v)
      }
      return headers
    } catch {
      logger.warn('invalid TASI_FEED_REQUEST_HEADERS_JSON; fallback to legacy header envs')
    }
  }

  const apiKeyHeaderKey = (process.env.TASI_FEED_X_API_KEY_HEADER_KEY || 'x-api-key').trim()
  const apiKeyHeaderValue = (process.env.TASI_FEED_X_API_KEY_HEADER_VALUE || '').trim()
  const internalCallHeaderKey = (process.env.TASI_FEED_X_INTERNAL_CALL_HEADER_KEY || 'x-internal-call').trim()
  const internalCallHeaderValue = (process.env.TASI_FEED_X_INTERNAL_CALL_HEADER_VALUE || '').trim()

  if (apiKeyHeaderKey && apiKeyHeaderValue) {
    headers.set(apiKeyHeaderKey, apiKeyHeaderValue)
  }
  if (internalCallHeaderKey && internalCallHeaderValue) {
    headers.set(internalCallHeaderKey, internalCallHeaderValue)
  }
  return headers
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
  const url = `${base}${BRIDGE_COMPANY_DAILY_PATH}`
  logger.info('company daily: in-memory cache miss, fetching from bridge', { url })
  const res = await fetch(url, { headers: buildBridgeHeaders() })
  if (!res.ok) {
    logger.fail('company daily: bridge failed', { status: res.status, url })
    throw new Error(`cf-feed-bridge company/daily failed: ${res.status} (${url})`)
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
  const url = `${base}${BRIDGE_SUMMARY_DAILY_PATH}`
  logger.info('summary daily: in-memory cache miss, fetching from bridge', { url })
  const res = await fetch(url, { headers: buildBridgeHeaders() })
  if (!res.ok) {
    logger.fail('summary daily: bridge failed', { status: res.status, url })
    throw new Error(`cf-feed-bridge summary/daily failed: ${res.status} (${url})`)
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
