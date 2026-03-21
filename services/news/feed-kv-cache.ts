import { after } from 'next/server'

import { isAppCacheDisabled } from '@/services/config/cache-debug'
import { getJsonKv, getKvClient, setJsonKvEx } from '@/services/kv/client'
import { createLogger } from '@/services/logger'
import { createLruCache } from '@/services/lru-cache'

import { mergeNewsFeedsToPool, type NewsFeedPoolCachePayload, reconcileNewsFeedPoolAfterFailedSourceRetry, reconcileNewsFeedPoolAfterRssFetch } from './aggregate-feed'
import { getNewsFeedRecentWindowHoursForListSlug } from './published-recent-window'
import type { NewsCategory, NewsSourceConfig } from './types'

const logger = createLogger('news-feed-kv-cache')

const POOL_KEY_PREFIX = 'news:feedpool:v3'
/** Bumped when pool payload shape changes (e.g. `sourceInventory`); invalidates KV keys via {@link buildNewsFeedPoolCacheKey}. */
const POOL_CACHE_SCHEMA_VERSION = 13

/** Pool KV TTL: default 24h so repeat visitors hit L2 instead of waiting on RSS. */
const POOL_MIN_TTL_SEC = 3_600
const POOL_MAX_TTL_SEC = 86_400
const POOL_DEFAULT_TTL_SEC = 86_400

const DEFAULT_REFRESH_MIN_INTERVAL_MS = 600_000
const MIN_REFRESH_INTERVAL_MS = 60_000
const MAX_REFRESH_INTERVAL_MS = 3_600_000

const DEFAULT_FAILED_RETRY_DELAY_MS = 60_000
const MIN_FAILED_RETRY_DELAY_MS = 30_000
const MAX_FAILED_RETRY_DELAY_MS = 300_000

/** One delayed `after()` retry per pool key at a time (avoid stacking timers on burst traffic). */
const failedRetryInFlight = new Set<string>()

/**
 * KV TTL for the merged news pool (`NEWS_FEED_KV_TTL_SECONDS`), clamped 3600–86400. Default 86400 (24 hours).
 * @returns Seconds until L2 expiry
 */
export function getNewsFeedPoolKvTtlSeconds(): number {
  const raw = process.env.NEWS_FEED_KV_TTL_SECONDS?.trim()
  if (!raw) {
    return POOL_DEFAULT_TTL_SEC
  }
  const n = Number.parseInt(raw, 10)
  if (!Number.isFinite(n)) {
    return POOL_DEFAULT_TTL_SEC
  }
  return Math.min(POOL_MAX_TTL_SEC, Math.max(POOL_MIN_TTL_SEC, n))
}

/**
 * L1 pool memory expiry (same duration as L2).
 * @returns Duration in ms
 */
export function getNewsFeedPoolCacheTtlMs(): number {
  return getNewsFeedPoolKvTtlSeconds() * 1000
}

/**
 * Minimum time between background RSS reconciles for the same pool key (`NEWS_FEED_POOL_REFRESH_MIN_INTERVAL_MS`).
 * @returns Milliseconds
 */
export function getNewsFeedPoolRefreshMinIntervalMs(): number {
  const raw = process.env.NEWS_FEED_POOL_REFRESH_MIN_INTERVAL_MS?.trim()
  if (!raw) {
    return DEFAULT_REFRESH_MIN_INTERVAL_MS
  }
  const n = Number.parseInt(raw, 10)
  if (!Number.isFinite(n)) {
    return DEFAULT_REFRESH_MIN_INTERVAL_MS
  }
  return Math.min(MAX_REFRESH_INTERVAL_MS, Math.max(MIN_REFRESH_INTERVAL_MS, n))
}

/**
 * Wait before re-fetching sources that failed (rate-limit / 429). `NEWS_FEED_FAILED_RETRY_DELAY_MS`, clamped 30s–300s, default 60s.
 * @returns Delay in milliseconds
 */
export function getNewsFeedFailedRetryDelayMs(): number {
  const raw = process.env.NEWS_FEED_FAILED_RETRY_DELAY_MS?.trim()
  if (!raw) {
    return DEFAULT_FAILED_RETRY_DELAY_MS
  }
  const n = Number.parseInt(raw, 10)
  if (!Number.isFinite(n)) {
    return DEFAULT_FAILED_RETRY_DELAY_MS
  }
  return Math.min(MAX_FAILED_RETRY_DELAY_MS, Math.max(MIN_FAILED_RETRY_DELAY_MS, n))
}

/**
 * Sleep for RSSHub / upstream cooldown between the user-facing response and a retry.
 * @param ms Duration in milliseconds
 * @returns Promise that resolves after `ms`
 */
function delayMs(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}

/**
 * Align `nowMs` to the start of a TTL-sized wall-clock bucket (legacy helper; pool keys no longer use this).
 * @param nowMs Current time (ms)
 * @param ttlMs Bucket size (ms)
 * @returns Bucket start timestamp (ms)
 */
export function alignWindowMsToTtlBucket(nowMs: number, ttlMs: number): number {
  return Math.floor(nowMs / ttlMs) * ttlMs
}

/**
 * Resolve rolling-window anchor: explicit `feedAnchor`, else `Date.now()` (pool is keyed without window; prune uses this per request).
 * @param params Raw anchor query and pagination offset
 * @returns Epoch ms for prune / `fetchedAt` alignment
 */
export function resolveNewsFeedWindowMs(params: { feedAnchorRaw: string | undefined; offset: number }): number {
  const raw = params.feedAnchorRaw?.trim()
  if (raw !== undefined && raw !== '') {
    const t = Date.parse(raw)
    if (!Number.isNaN(t)) {
      return t
    }
  }
  return Date.now()
}

/** L1: merged pools are large — keep fewer entries than page-level cache. */
const L1_POOL_MAX_ENTRIES = 48

interface NewsFeedPoolMemoryEntry {
  storedAtMs: number
  payload: NewsFeedPoolCachePayload
}

const poolMemoryState: { lru: ReturnType<typeof createLruCache<string, NewsFeedPoolMemoryEntry>> } = {
  lru: createLruCache<string, NewsFeedPoolMemoryEntry>(L1_POOL_MAX_ENTRIES),
}

/**
 * Read merged pool from L1 if present and within TTL.
 * @param poolCacheKey Key from {@link buildNewsFeedPoolCacheKey}
 * @returns Payload or null
 */
export function getNewsFeedPoolMemoryCached(poolCacheKey: string): NewsFeedPoolCachePayload | null {
  if (isAppCacheDisabled()) {
    return null
  }
  const entry = poolMemoryState.lru.get(poolCacheKey)
  if (!entry) {
    return null
  }
  const ttlMs = getNewsFeedPoolCacheTtlMs()
  if (Date.now() - entry.storedAtMs >= ttlMs) {
    poolMemoryState.lru.delete(poolCacheKey)
    return null
  }
  return entry.payload
}

/**
 * Store merged pool in L1.
 * @param poolCacheKey Stable pool key
 * @param payload Full pool payload
 */
export function setNewsFeedPoolMemoryCached(poolCacheKey: string, payload: NewsFeedPoolCachePayload): void {
  if (isAppCacheDisabled()) {
    return
  }
  poolMemoryState.lru.set(poolCacheKey, { storedAtMs: Date.now(), payload })
}

/**
 * Hex-encoded SHA-256 (Edge-safe).
 * @param text Input string
 * @returns 64-char hex
 */
async function sha256Hex(text: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

/**
 * Dimensions for **one** merged RSS pool (no facet / offset / limit / window — those are applied after read).
 */
export interface NewsFeedPoolCacheKeyParts {
  baseUrl: string
  category: string
  /** Manifest sub-tab slug when `category` is set; empty when no list category (all-pool). */
  subcategory: string
  region: string
  maxFeeds: number
  /** Rolling `publishedAt` window (hours); must match {@link mergeNewsFeedsToPool} for this pool. */
  recentWindowHours: number
}

/**
 * KV key for the merged pool only.
 * @param parts Normalized pool dimensions
 * @returns `news:feedpool:v3:<sha256>`
 */
export async function buildNewsFeedPoolCacheKey(parts: NewsFeedPoolCacheKeyParts): Promise<string> {
  const canonical = JSON.stringify({
    v: POOL_CACHE_SCHEMA_VERSION,
    baseUrl: parts.baseUrl,
    category: parts.category,
    subcategory: parts.subcategory,
    region: parts.region,
    maxFeeds: parts.maxFeeds,
    recentWindowHours: parts.recentWindowHours,
  })
  const hash = await sha256Hex(canonical)
  return `${POOL_KEY_PREFIX}:${hash}`
}

/**
 * Validate JSON from KV before using as a pool payload.
 * @param data Unknown value
 * @returns Type guard
 */
export function isNewsFeedPoolCachePayload(data: unknown): data is NewsFeedPoolCachePayload {
  if (data === null || typeof data !== 'object') {
    return false
  }
  const p = data as Record<string, unknown>
  if (!Array.isArray(p.pool) || typeof p.baseUrl !== 'string' || typeof p.fetchedAt !== 'string') {
    return false
  }
  if (typeof p.windowAtMs !== 'number' || !Number.isFinite(p.windowAtMs)) {
    return false
  }
  if (p.lastMergedAtMs !== undefined && (typeof p.lastMergedAtMs !== 'number' || !Number.isFinite(p.lastMergedAtMs))) {
    return false
  }
  if (p.facets === null || typeof p.facets !== 'object') {
    return false
  }
  const facets = p.facets as Record<string, unknown>
  if (!Array.isArray(facets.categories) || !Array.isArray(facets.keywords) || !Array.isArray(facets.sources)) {
    return false
  }
  if (!Array.isArray(p.errors)) {
    return false
  }
  return true
}

/**
 * Run RSS fetch + reconcile into L1/L2 (single-flight per `poolCacheKey`).
 * @param args Same dimensions as {@link getOrBuildNewsFeedMergedPool}
 */
async function executeNewsFeedPoolBackgroundRefresh(args: {
  poolCacheKey: string
  sources: NewsSourceConfig[]
  baseUrl: string
  itemCategory?: NewsCategory
  listSlug: string
}): Promise<void> {
  if (isAppCacheDisabled()) {
    return
  }
  const { poolCacheKey, sources, baseUrl, itemCategory, listSlug } = args
  let previous = getNewsFeedPoolMemoryCached(poolCacheKey)
  const kv = getKvClient()
  if (previous === null && kv) {
    const raw = await getJsonKv<unknown>(poolCacheKey)
    if (raw !== null && isNewsFeedPoolCachePayload(raw)) {
      previous = raw
    }
  }
  const previousItems = previous?.pool ?? []
  const nowMs = Date.now()
  const fresh = await mergeNewsFeedsToPool(sources, baseUrl, { windowAtMs: nowMs, itemCategory, listSlug })
  const reconciled = reconcileNewsFeedPoolAfterRssFetch({
    previousItems,
    fresh,
    sources,
    itemCategory,
  })
  const payload: NewsFeedPoolCachePayload = { ...reconciled, baseUrl }
  if (kv) {
    await setJsonKvEx(poolCacheKey, payload, getNewsFeedPoolKvTtlSeconds())
  }
  setNewsFeedPoolMemoryCached(poolCacheKey, payload)
}

/**
 * Blocking refresh: fetch RSS, reconcile with the previous pool, write L1 and KV. Same logic as the `after()` background job.
 * Use from cron or manual warm; keep pool key dimensions aligned with `GET /api/news/feed`.
 * @param args Pool cache key, sources slice, base URL, optional list category filter
 */
export async function refreshNewsFeedMergedPool(args: {
  poolCacheKey: string
  sources: NewsSourceConfig[]
  baseUrl: string
  itemCategory?: NewsCategory
  listSlug: string
}): Promise<void> {
  await executeNewsFeedPoolBackgroundRefresh(args)
}

/**
 * Whether a cached pool is due for background RSS reconcile (same rule as {@link scheduleNewsFeedPoolBackgroundRefreshIfStale}).
 * @param poolLayerHit L1/L2 hit or null on miss
 * @param payload Current pool row
 * @returns True when `after()` refresh would run
 */
export function isNewsFeedPoolBackgroundRefreshDue(poolLayerHit: 'l1' | 'l2' | null, payload: NewsFeedPoolCachePayload): boolean {
  if (poolLayerHit === null) {
    return false
  }
  const last = payload.lastMergedAtMs ?? 0
  return Date.now() - last >= getNewsFeedPoolRefreshMinIntervalMs()
}

/**
 * Schedule a non-blocking RSS refresh when the pool was served from cache and is older than {@link getNewsFeedPoolRefreshMinIntervalMs}.
 * Uses `after()` from Next.js (Node.js runtime).
 * @param params Hit layer, payload, key, merge inputs
 */
export function scheduleNewsFeedPoolBackgroundRefreshIfStale(params: {
  poolLayerHit: 'l1' | 'l2' | null
  payload: NewsFeedPoolCachePayload
  poolCacheKey: string
  sources: NewsSourceConfig[]
  baseUrl: string
  itemCategory?: NewsCategory
  listSlug: string
}): void {
  const { poolLayerHit, payload, poolCacheKey, sources, baseUrl, itemCategory, listSlug } = params
  if (!isNewsFeedPoolBackgroundRefreshDue(poolLayerHit, payload)) {
    return
  }

  try {
    after(async () => {
      try {
        await executeNewsFeedPoolBackgroundRefresh({ poolCacheKey, sources, baseUrl, itemCategory, listSlug })
        const refreshOkSummary = 'Background RSS refresh finished (pool cache updated).'
        logger.info(
          refreshOkSummary,
          JSON.stringify({
            flow: 'News merged pool',
            step: 'background_refresh',
            message: refreshOkSummary,
            event: 'news_feed_pool_refresh',
            ok: true,
          })
        )
      } catch (e) {
        const errText = e instanceof Error ? e.message : String(e)
        const refreshFailSummary = `Background RSS refresh failed — ${errText}`
        logger.warn(
          refreshFailSummary,
          JSON.stringify({
            flow: 'News merged pool',
            step: 'background_refresh',
            message: refreshFailSummary,
            event: 'news_feed_pool_refresh',
            ok: false,
            errorDetail: errText,
          })
        )
      }
    })
  } catch (e) {
    const skipErr = e instanceof Error ? e.message : String(e)
    const skipSummary = `Skipped background refresh (after() unavailable) — ${skipErr}`
    logger.warn(
      skipSummary,
      JSON.stringify({
        flow: 'News merged pool',
        step: 'background_refresh',
        message: skipSummary,
        event: 'news_feed_pool_refresh_skip',
        reason: 'after_unavailable',
        errorDetail: skipErr,
      })
    )
  }
}

/**
 * Re-fetch only sources still listed in `payload.errors`, merge into the current pool, write L1/L2.
 * Reloads the pool after the delay so concurrent stale refresh can clear errors first.
 * @param args Pool key, same `sources` slice as the API request, base URL, optional category filter
 */
async function executeNewsFeedFailedSourcesRetry(args: {
  poolCacheKey: string
  sources: NewsSourceConfig[]
  baseUrl: string
  itemCategory?: NewsCategory
  listSlug: string
  /** Milliseconds waited before this re-fetch (for logs). */
  waitedMs: number
}): Promise<void> {
  if (isAppCacheDisabled()) {
    return
  }
  const { poolCacheKey, sources, baseUrl, itemCategory, listSlug, waitedMs } = args
  let previous = getNewsFeedPoolMemoryCached(poolCacheKey)
  const kv = getKvClient()
  if (previous === null && kv) {
    const raw = await getJsonKv<unknown>(poolCacheKey)
    if (raw !== null && isNewsFeedPoolCachePayload(raw)) {
      previous = raw
    }
  }
  if (previous === null) {
    logger.info('Failed-source retry skipped (no pool in L1/KV)', JSON.stringify({ event: 'news_feed_failed_retry_skip', reason: 'no_pool' }))
    return
  }

  const failedIds = [...new Set((previous.errors ?? []).map((e) => e.sourceId))]
  if (failedIds.length === 0) {
    logger.info('Failed-source retry skipped (no errors on snapshot)', JSON.stringify({ event: 'news_feed_failed_retry_skip', reason: 'no_errors' }))
    return
  }

  const retrySources = sources.filter((s) => failedIds.includes(s.id))
  if (retrySources.length === 0) {
    logger.info(
      'Failed-source retry skipped (failed ids not in current source slice)',
      JSON.stringify({ event: 'news_feed_failed_retry_skip', reason: 'no_matching_sources', failedIds })
    )
    return
  }

  const nowMs = Date.now()
  const freshPartial = await mergeNewsFeedsToPool(retrySources, baseUrl, { windowAtMs: nowMs, itemCategory, listSlug })
  const reconciled = reconcileNewsFeedPoolAfterFailedSourceRetry({
    previousItems: previous.pool,
    previousErrors: previous.errors ?? [],
    freshPartial,
    retriedSourceIds: retrySources.map((s) => s.id),
    allSources: sources,
    itemCategory,
  })
  const payload: NewsFeedPoolCachePayload = { ...reconciled, baseUrl }
  if (kv) {
    await setJsonKvEx(poolCacheKey, payload, getNewsFeedPoolKvTtlSeconds())
  }
  setNewsFeedPoolMemoryCached(poolCacheKey, payload)

  const retryOkSummary = `Failed-source retry finished (waited ${waitedMs}ms before re-fetch, ${retrySources.length} sources).`
  logger.info(
    retryOkSummary,
    JSON.stringify({
      flow: 'News merged pool',
      step: 'failed_source_retry',
      message: retryOkSummary,
      event: 'news_feed_failed_retry',
      ok: true,
      waitedMs,
      retriedSourceIds: retrySources.map((s) => s.id),
      remainingErrors: payload.errors.length,
    })
  )
}

/**
 * When the merged pool reports fetch errors, schedule one `after()` job: wait {@link getNewsFeedFailedRetryDelayMs}, then re-fetch those sources only and reconcile into L1/KV.
 * Idempotent per `poolCacheKey` until the job finishes (avoids piling timers). Re-reads errors after the delay.
 * @param params Pool key and same merge inputs as the HTTP handler
 */
export function scheduleNewsFeedFailedSourcesRetryIfNeeded(params: {
  poolCacheKey: string
  sources: NewsSourceConfig[]
  baseUrl: string
  itemCategory?: NewsCategory
  listSlug: string
}): void {
  if (isAppCacheDisabled()) {
    return
  }
  const { poolCacheKey, sources, baseUrl, itemCategory, listSlug } = params
  if (failedRetryInFlight.has(poolCacheKey)) {
    return
  }
  failedRetryInFlight.add(poolCacheKey)

  try {
    after(async () => {
      try {
        const waitedMs = getNewsFeedFailedRetryDelayMs()
        await delayMs(waitedMs)
        await executeNewsFeedFailedSourcesRetry({
          poolCacheKey,
          sources,
          baseUrl,
          itemCategory,
          listSlug,
          waitedMs,
        })
      } catch (e) {
        const errText = e instanceof Error ? e.message : String(e)
        const failSummary = `Failed-source retry error — ${errText}`
        logger.warn(
          failSummary,
          JSON.stringify({
            flow: 'News merged pool',
            step: 'failed_source_retry',
            message: failSummary,
            event: 'news_feed_failed_retry',
            ok: false,
            errorDetail: errText,
          })
        )
      } finally {
        failedRetryInFlight.delete(poolCacheKey)
      }
    })
  } catch (e) {
    failedRetryInFlight.delete(poolCacheKey)
    const skipErr = e instanceof Error ? e.message : String(e)
    const skipSummary = `Skipped failed-source retry (after() unavailable) — ${skipErr}`
    logger.warn(
      skipSummary,
      JSON.stringify({
        flow: 'News merged pool',
        step: 'failed_source_retry',
        message: skipSummary,
        event: 'news_feed_failed_retry_skip',
        reason: 'after_unavailable',
        errorDetail: skipErr,
      })
    )
  }
}

/**
 * L1 → L2 → merge RSS; on miss write L2 then L1. Facet/offset/limit are **not** part of the key.
 * @param args Pool key, sources, merge options
 * @returns Payload and which layer served the pool (null = fresh merge)
 */
export async function getOrBuildNewsFeedMergedPool(args: {
  poolCacheKey: string
  sources: NewsSourceConfig[]
  baseUrl: string
  windowAtMs: number
  itemCategory?: NewsCategory
  listSlug: string
}): Promise<{ payload: NewsFeedPoolCachePayload; poolLayerHit: 'l1' | 'l2' | null }> {
  const { poolCacheKey, sources, baseUrl, windowAtMs, itemCategory, listSlug } = args

  if (isAppCacheDisabled()) {
    const merged = await mergeNewsFeedsToPool(sources, baseUrl, { windowAtMs, itemCategory, listSlug })
    const payload: NewsFeedPoolCachePayload = { ...merged, baseUrl }
    return { payload, poolLayerHit: null }
  }

  const mem = getNewsFeedPoolMemoryCached(poolCacheKey)
  if (mem !== null) {
    return { payload: mem, poolLayerHit: 'l1' }
  }

  const kv = getKvClient()
  if (kv) {
    const raw = await getJsonKv<unknown>(poolCacheKey)
    if (raw !== null && isNewsFeedPoolCachePayload(raw)) {
      setNewsFeedPoolMemoryCached(poolCacheKey, raw)
      return { payload: raw, poolLayerHit: 'l2' }
    }
  }

  const merged = await mergeNewsFeedsToPool(sources, baseUrl, { windowAtMs, itemCategory, listSlug })
  const payload: NewsFeedPoolCachePayload = { ...merged, baseUrl }

  if (kv) {
    await setJsonKvEx(poolCacheKey, payload, getNewsFeedPoolKvTtlSeconds())
  }
  setNewsFeedPoolMemoryCached(poolCacheKey, payload)
  return { payload, poolLayerHit: null }
}

/**
 * Recent-window hours for a pool key (same rule as merge).
 * @param listSubcategoryNorm Flat list slug or empty for the all-pool
 * @returns Hours used in {@link buildNewsFeedPoolCacheKey} and {@link mergeNewsFeedsToPool}
 */
export function resolveNewsFeedPoolRecentWindowHours(listSubcategoryNorm: string): number {
  return getNewsFeedRecentWindowHoursForListSlug(listSubcategoryNorm)
}
