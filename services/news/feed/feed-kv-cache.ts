import { isAppCacheDisabled } from '@/services/config/cache-debug'
import { getJsonKv, getKvClient, setJsonKvEx } from '@/services/kv/client'
import { createLruCache } from '@/services/lru-cache'

import type { NewsCategory, NewsSourceConfig } from '../types'
import { mergeNewsFeedsToPool, type NewsFeedPoolCachePayload, reconcileNewsFeedPoolAfterRssFetch } from './aggregate-feed'
import { getNewsFeedRecentWindowHoursForListSlug } from './published-recent-window'

const POOL_KEY_PREFIX = 'news:feedpool:v3'
/** Bumped when pool payload shape changes (e.g. `sourceInventory`); invalidates KV keys via {@link buildNewsFeedPoolCacheKey}. */
const POOL_CACHE_SCHEMA_VERSION = 15

/** Pool KV TTL: default 24h so repeat visitors hit L2 instead of waiting on RSS. */
const POOL_MIN_TTL_SEC = 3_600
const POOL_MAX_TTL_SEC = 86_400
const POOL_DEFAULT_TTL_SEC = 86_400

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
 * Blocking refresh: fetch RSS, reconcile with the previous pool, write L1 and KV.
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
