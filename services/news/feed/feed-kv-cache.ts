import { isAppCacheDisabled } from '@/services/config/cache-debug'
import { getJsonKv, getKvClient, setJsonKvEx } from '@/services/kv/client'
import { createLogger } from '@/services/logger'
import { createLruCache } from '@/services/lru-cache'

import type { AggregatedNewsItem, NewsCategory, NewsSourceConfig } from '../types'
import {
  mergeNewsFeedsToPool,
  type NewsFeedPoolCachePayload,
  reconcileNewsFeedPoolAfterFailedSourceRetry,
  reconcileNewsFeedPoolAfterRssFetch,
  resolveNewsFeedMergeWallDeadlineMs,
} from './aggregate-feed'
import { getNewsFeedRecentWindowHoursForListSlug } from './published-recent-window'

const POOL_KEY_PREFIX = 'news:feedpool:v3'
/** Bumped when pool payload shape changes (e.g. `sourceInventory`); invalidates KV keys via {@link buildNewsFeedPoolCacheKey}. */
const POOL_CACHE_SCHEMA_VERSION = 15

/** Pool KV TTL bounds (seconds). */
const POOL_MIN_TTL_SEC = 3_600
const POOL_MAX_TTL_SEC = 86_400
const POOL_DEFAULT_TTL_SEC = 86_400

/**
 * Default interval (ms) after which an L1/L2 pool hit may trigger an inline RSS reconcile on the HTTP path (`offset=0` only).
 * Set `NEWS_FEED_POOL_REFRESH_MS=0` to disable.
 */
const DEFAULT_POOL_REFRESH_MS = 600_000

/** Hard wall for `GET /api/news/feed` handler (ms): pool phase must finish with {@link getNewsFeedHandlerTailReserveMs} left for prune/slice/JSON. */
const MIN_HANDLER_BUDGET_MS = 5_000
const MAX_HANDLER_BUDGET_MS = 30_000
const DEFAULT_HANDLER_BUDGET_MS = 10_000

/** Reserved after RSS merge for prune, finalize keywords, slice, serialization. */
const MIN_TAIL_RESERVE_MS = 400
const MAX_TAIL_RESERVE_MS = 5_000
const DEFAULT_TAIL_RESERVE_MS = 1_500

/** Do not start inline refresh unless this many ms remain besides tail (merge can be slow). */
const INLINE_REFRESH_EXTRA_MIN_MS = 6_500

const logger = createLogger('news-feed-kv-cache')

function parseEnvIntClamped(name: string, defaultVal: number, min: number, max: number): number {
  const raw = process.env[name]?.trim()
  if (!raw) {
    return defaultVal
  }
  const n = Number.parseInt(raw, 10)
  if (!Number.isFinite(n)) {
    return defaultVal
  }
  return Math.min(max, Math.max(min, n))
}

/**
 * Total HTTP handler budget for the news feed route (ms). Pool work is further capped by {@link getNewsFeedHandlerTailReserveMs}.
 * @returns Clamped milliseconds (default 10000 for ~10s Vercel Hobby)
 */
export function getNewsFeedHttpHandlerBudgetMs(): number {
  return parseEnvIntClamped('NEWS_FEED_HANDLER_DEADLINE_MS', DEFAULT_HANDLER_BUDGET_MS, MIN_HANDLER_BUDGET_MS, MAX_HANDLER_BUDGET_MS)
}

/**
 * Milliseconds reserved after the pool phase for prune, facet finalize, slice, and JSON.
 * @returns Clamped tail reserve (default 1500)
 */
export function getNewsFeedHandlerTailReserveMs(): number {
  return parseEnvIntClamped('NEWS_FEED_HANDLER_TAIL_RESERVE_MS', DEFAULT_TAIL_RESERVE_MS, MIN_TAIL_RESERVE_MS, MAX_TAIL_RESERVE_MS)
}

/**
 * Absolute epoch ms when the handler should have completed the pool phase (merge + optional inline refresh).
 * @param handlerStartedAtMs Value of `Date.now()` at the start of the route handler
 * @returns Epoch ms deadline for pool work (before tail reserve)
 */
export function getNewsFeedHttpHandlerDeadlineEpochMs(handlerStartedAtMs: number): number {
  return handlerStartedAtMs + getNewsFeedHttpHandlerBudgetMs()
}

/**
 * Merge wall deadline capped by HTTP handler deadline minus tail so RSS work stops in time to return JSON within budget.
 * @param handlerDeadlineEpochMs Absolute pool-phase deadline from {@link getNewsFeedHttpHandlerDeadlineEpochMs}, or undefined to use env/Vercel merge wall only
 * @returns Epoch ms passed to {@link mergeNewsFeedsToPool}, or undefined when uncapped
 */
export function resolveEffectiveMergeWallDeadlineMs(handlerDeadlineEpochMs: number | undefined): number | undefined {
  const envWall = resolveNewsFeedMergeWallDeadlineMs()
  if (handlerDeadlineEpochMs === undefined) {
    return envWall
  }
  const cap = handlerDeadlineEpochMs - getNewsFeedHandlerTailReserveMs()
  if (cap <= Date.now()) {
    return Date.now() - 1
  }
  if (envWall !== undefined) {
    return Math.min(envWall, cap)
  }
  return cap
}

function allowInlineRefreshGivenHandlerBudget(handlerDeadlineEpochMs: number | undefined, allowInlinePoolRefresh: boolean): boolean {
  if (!allowInlinePoolRefresh) {
    return false
  }
  if (handlerDeadlineEpochMs === undefined) {
    return true
  }
  const remaining = handlerDeadlineEpochMs - Date.now()
  return remaining >= getNewsFeedHandlerTailReserveMs() + INLINE_REFRESH_EXTRA_MIN_MS
}

/**
 * KV TTL for the merged news pool when env `NEWS_FEED_KV_TTL_SECONDS` is set (legacy global override), clamped 3600–86400.
 * When unset, use {@link getNewsFeedPoolKvTtlSecondsForListSlug} instead.
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
 * L2/L1 TTL for one pool: if `NEWS_FEED_KV_TTL_SECONDS` is set, that global value (clamped); otherwise `recentWindowHours * 3600` (clamped) so retention tracks the content window.
 * @param listSlug Flat list slug or empty string for the all-category pool
 * @returns Seconds for `setJsonKvEx` / L1 `ttlMs`
 */
export function getNewsFeedPoolKvTtlSecondsForListSlug(listSlug: string): number {
  const envRaw = process.env.NEWS_FEED_KV_TTL_SECONDS?.trim()
  if (envRaw) {
    return getNewsFeedPoolKvTtlSeconds()
  }
  const hours = getNewsFeedRecentWindowHoursForListSlug(listSlug)
  const fromWindow = hours * 3600
  return Math.min(POOL_MAX_TTL_SEC, Math.max(POOL_MIN_TTL_SEC, fromWindow))
}

/**
 * L1 pool memory expiry when the entry has no per-write `ttlMs` (legacy entries).
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
  /** Wall-clock TTL for this entry (ms). When missing, {@link getNewsFeedPoolCacheTtlMs} applies. */
  ttlMs?: number
}

const poolMemoryState: { lru: ReturnType<typeof createLruCache<string, NewsFeedPoolMemoryEntry>> } = {
  lru: createLruCache<string, NewsFeedPoolMemoryEntry>(L1_POOL_MAX_ENTRIES),
}

function l1EntryTtlMs(entry: NewsFeedPoolMemoryEntry): number {
  return entry.ttlMs ?? getNewsFeedPoolCacheTtlMs()
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
  const ttlMs = l1EntryTtlMs(entry)
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
 * @param ttlSeconds Optional L1/KV-aligned TTL in seconds (from {@link getNewsFeedPoolKvTtlSecondsForListSlug})
 */
export function setNewsFeedPoolMemoryCached(poolCacheKey: string, payload: NewsFeedPoolCachePayload, ttlSeconds?: number): void {
  if (isAppCacheDisabled()) {
    return
  }
  const ttlMs = ttlSeconds !== undefined ? ttlSeconds * 1000 : getNewsFeedPoolCacheTtlMs()
  poolMemoryState.lru.set(poolCacheKey, { storedAtMs: Date.now(), payload, ttlMs })
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
 * Parse inline pool refresh interval from env (`NEWS_FEED_POOL_REFRESH_MS`).
 * @returns Milliseconds between refresh attempts, or 0 when disabled
 */
export function getNewsFeedPoolRefreshIntervalMs(): number {
  const raw = process.env.NEWS_FEED_POOL_REFRESH_MS?.trim()?.toLowerCase()
  if (raw === '0' || raw === 'off' || raw === 'false') {
    return 0
  }
  if (!raw) {
    return DEFAULT_POOL_REFRESH_MS
  }
  const n = Number.parseInt(raw, 10)
  if (!Number.isFinite(n) || n < 0) {
    return DEFAULT_POOL_REFRESH_MS
  }
  return n
}

/**
 * Age of the pool row since last merge metadata (ms).
 * @param payload Cached or fresh pool
 * @returns Non-negative ms
 */
export function getNewsFeedPoolPayloadAgeMs(payload: NewsFeedPoolCachePayload): number {
  const t = payload.lastMergedAtMs ?? payload.windowAtMs
  return Math.max(0, Date.now() - t)
}

/**
 * L1 → L2 read only (no RSS, no inline refresh). Used when the HTTP handler pool budget is exhausted.
 * @param args Pool key and list slug (for L2→L1 TTL)
 * @returns Payload and layer, or null
 */
export async function tryReadNewsFeedPoolFromCacheOnly(args: {
  poolCacheKey: string
  listSlug: string
}): Promise<{ payload: NewsFeedPoolCachePayload; poolLayerHit: 'l1' | 'l2' } | null> {
  if (isAppCacheDisabled()) {
    return null
  }
  const { poolCacheKey, listSlug } = args
  const mem = getNewsFeedPoolMemoryCached(poolCacheKey)
  if (mem !== null) {
    return { payload: mem, poolLayerHit: 'l1' }
  }
  const kv = getKvClient()
  if (!kv) {
    return null
  }
  const raw = await getJsonKv<unknown>(poolCacheKey)
  if (raw === null || !isNewsFeedPoolCachePayload(raw)) {
    return null
  }
  const ttlSec = getNewsFeedPoolKvTtlSecondsForListSlug(listSlug)
  setNewsFeedPoolMemoryCached(poolCacheKey, raw, ttlSec)
  return { payload: raw, poolLayerHit: 'l2' }
}

/**
 * Empty pool row when the handler deadline fires with no cache (still returns 200 + valid shape).
 * @param baseUrl RSS base URL for JSON
 * @param windowAtMs Request window anchor
 * @param sources Requested manifest slice (for counts)
 * @param listSlug List slug for recent window hours
 * @returns Minimal {@link NewsFeedPoolCachePayload}
 */
export function createEmptyDeadlinePoolPayload(baseUrl: string, windowAtMs: number, sources: NewsSourceConfig[], listSlug: string): NewsFeedPoolCachePayload {
  const recentWindowHours = getNewsFeedRecentWindowHoursForListSlug(listSlug)
  const n = sources.length
  return {
    pool: [],
    baseUrl,
    facets: { categories: [], keywords: [], sources: [] },
    errors: [],
    fetchedAt: new Date(windowAtMs).toISOString(),
    windowAtMs,
    lastMergedAtMs: windowAtMs,
    sourcesRequested: n,
    sourcesWithItems: 0,
    sourcesEmptyOrFailed: n,
    rawItemCount: 0,
    droppedMissingLink: 0,
    duplicateDropped: 0,
    duplicateDroppedByTitle: 0,
    droppedOutsideRecentWindow: 0,
    recentWindowHours,
  }
}

export type NewsFeedPoolRefreshStatus = 'none' | 'inline_ok' | 'inline_failed_stale'

export type NewsFeedHandlerDeadlineStatus = 'ok' | 'cache_only' | 'empty_timeout'

/** Result of one coalesced RSS pass (cold merge or inline reconcile) shared by concurrent waiters. */
type NewsFeedPoolInflightResult = {
  payload: NewsFeedPoolCachePayload
  poolLayerHit: 'l1' | 'l2' | null
  poolRefreshStatus: NewsFeedPoolRefreshStatus
}

/** In-flight RSS work per pool key so concurrent `GET /api/news/feed` calls do not duplicate merges. */
const poolInflightRssByKey = new Map<string, Promise<NewsFeedPoolInflightResult>>()

/**
 * Run at most one RSS merge/reconcile per `poolCacheKey` at a time; concurrent callers await the same promise.
 * @param poolCacheKey Stable merged-pool key
 * @param run Leader-only async body (re-check L1/L2 inside for cold paths when needed)
 * @returns Shared build outcome for all waiters
 */
async function coalesceNewsFeedPoolRssByKey(poolCacheKey: string, run: () => Promise<NewsFeedPoolInflightResult>): Promise<NewsFeedPoolInflightResult> {
  const existing = poolInflightRssByKey.get(poolCacheKey)
  if (existing) {
    return existing
  }
  let inflight!: Promise<NewsFeedPoolInflightResult>
  inflight = (async () => {
    try {
      return await run()
    } finally {
      if (poolInflightRssByKey.get(poolCacheKey) === inflight) {
        poolInflightRssByKey.delete(poolCacheKey)
      }
    }
  })()
  poolInflightRssByKey.set(poolCacheKey, inflight)
  return inflight
}

/**
 * Attempt RSS merge + reconcile; on throw, caller keeps previous pool.
 */
async function tryInlineReconcilePool(args: {
  poolCacheKey: string
  previousItems: AggregatedNewsItem[]
  sources: NewsSourceConfig[]
  baseUrl: string
  itemCategory?: NewsCategory
  listSlug: string
  handlerDeadlineEpochMs?: number
}): Promise<NewsFeedPoolCachePayload> {
  const { poolCacheKey, previousItems, sources, baseUrl, itemCategory, listSlug, handlerDeadlineEpochMs } = args
  const kv = getKvClient()
  const ttlSec = getNewsFeedPoolKvTtlSecondsForListSlug(listSlug)
  const nowMs = Date.now()
  const mergeWallDeadlineMs = resolveEffectiveMergeWallDeadlineMs(handlerDeadlineEpochMs)
  const fresh = await mergeNewsFeedsToPool(sources, baseUrl, {
    windowAtMs: nowMs,
    itemCategory,
    listSlug,
    ...(mergeWallDeadlineMs !== undefined ? { mergeWallDeadlineMs } : {}),
  })
  const reconciled = reconcileNewsFeedPoolAfterRssFetch({
    previousItems,
    fresh,
    sources,
    itemCategory,
  })
  const payload: NewsFeedPoolCachePayload = { ...reconciled, baseUrl }
  if (kv) {
    await setJsonKvEx(poolCacheKey, payload, ttlSec)
  }
  setNewsFeedPoolMemoryCached(poolCacheKey, payload, ttlSec)
  return payload
}

/**
 * Inline reconcile with single-flight per key (shared with cold build on the same key).
 * @param args Stale row, cache layer, and merge inputs
 * @returns Fresh payload or stale fallback with refresh status
 */
async function runCoalescedInlineReconcilePool(args: {
  poolCacheKey: string
  stalePayload: NewsFeedPoolCachePayload
  staleLayer: 'l1' | 'l2'
  sources: NewsSourceConfig[]
  baseUrl: string
  itemCategory?: NewsCategory
  listSlug: string
  handlerDeadlineEpochMs?: number
}): Promise<NewsFeedPoolInflightResult> {
  const { poolCacheKey, stalePayload, staleLayer, sources, baseUrl, itemCategory, listSlug, handlerDeadlineEpochMs } = args
  return coalesceNewsFeedPoolRssByKey(poolCacheKey, async () => {
    try {
      const payload = await tryInlineReconcilePool({
        poolCacheKey,
        previousItems: stalePayload.pool,
        sources,
        baseUrl,
        itemCategory,
        listSlug,
        handlerDeadlineEpochMs,
      })
      return { payload, poolLayerHit: null, poolRefreshStatus: 'inline_ok' }
    } catch (e) {
      logger.warn(
        `Inline pool refresh failed; serving stale ${staleLayer === 'l1' ? 'L1' : 'L2'}`,
        e instanceof Error ? e.message : String(e),
        JSON.stringify({ poolCacheKey, listSlug })
      )
      return { payload: stalePayload, poolLayerHit: staleLayer, poolRefreshStatus: 'inline_failed_stale' }
    }
  })
}

/**
 * Run RSS fetch + reconcile into L1/L2. Not coalesced with HTTP {@link getOrBuildNewsFeedMergedPool} (space cron runs to limit duplicate RSS with hot keys).
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
  const ttlSec = getNewsFeedPoolKvTtlSecondsForListSlug(listSlug)
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
    await setJsonKvEx(poolCacheKey, payload, ttlSec)
  }
  setNewsFeedPoolMemoryCached(poolCacheKey, payload, ttlSec)
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
 * Re-fetch RSS for selected manifest ids only, merge into the cached pool, and write L1/L2.
 * Shares {@link coalesceNewsFeedPoolRssByKey} with full merges to avoid duplicate RSS under burst traffic.
 * @param args Pool key, cached row from L1/L2, full manifest slice, ids to retry, merge options
 * @returns Updated pool payload (also persisted when caching is enabled)
 */
export async function applyRetrySourcesToNewsFeedPool(args: {
  poolCacheKey: string
  cachedPayload: NewsFeedPoolCachePayload
  allSources: NewsSourceConfig[]
  retrySourceIds: string[]
  baseUrl: string
  itemCategory?: NewsCategory
  listSlug: string
  handlerDeadlineEpochMs?: number
}): Promise<NewsFeedPoolCachePayload> {
  const { poolCacheKey, cachedPayload, allSources, retrySourceIds, baseUrl, itemCategory, listSlug, handlerDeadlineEpochMs } = args
  const retrySet = new Set(retrySourceIds)
  const partialSources = allSources.filter((s) => retrySet.has(s.id))
  if (partialSources.length === 0) {
    return cachedPayload
  }
  const coalesced = await coalesceNewsFeedPoolRssByKey(poolCacheKey, async () => {
    const memPayload = getNewsFeedPoolMemoryCached(poolCacheKey)
    const base = memPayload ?? cachedPayload
    const mergeWallDeadlineMs = resolveEffectiveMergeWallDeadlineMs(handlerDeadlineEpochMs)
    const nowMs = Date.now()
    const freshPartial = await mergeNewsFeedsToPool(partialSources, baseUrl, {
      windowAtMs: nowMs,
      itemCategory,
      listSlug,
      ...(mergeWallDeadlineMs !== undefined ? { mergeWallDeadlineMs } : {}),
    })
    const merged = reconcileNewsFeedPoolAfterFailedSourceRetry({
      previousItems: base.pool,
      previousErrors: base.errors ?? [],
      freshPartial,
      retriedSourceIds: [...retrySet],
      allSources,
      itemCategory,
      previousParsedBySourceId: base.parsedBySourceId,
    })
    const ttlSec = getNewsFeedPoolKvTtlSecondsForListSlug(listSlug)
    const payload: NewsFeedPoolCachePayload = { ...merged, baseUrl: base.baseUrl }
    const kv = getKvClient()
    if (kv) {
      await setJsonKvEx(poolCacheKey, payload, ttlSec)
    }
    setNewsFeedPoolMemoryCached(poolCacheKey, payload, ttlSec)
    return { payload, poolLayerHit: null, poolRefreshStatus: 'none' as const }
  })
  return coalesced.payload
}

/**
 * L1 → L2 → merge RSS; on miss write L2 then L1. Facet/offset/limit are **not** part of the key.
 * When `allowInlinePoolRefresh` is true and the pool is older than {@link getNewsFeedPoolRefreshIntervalMs},
 * runs a blocking reconcile (no merge wall); on failure returns the previous pool and `inline_failed_stale`.
 * Concurrent callers with the same `poolCacheKey` coalesce RSS work (cold merge, inline reconcile, or
 * `DISABLE_CACHE` merge) so burst traffic does not multiply upstream fetches.
 * @param args Pool key, sources, merge options; optional `handlerDeadlineEpochMs` caps merge wall and can skip
 *   inline refresh under `/api/news/feed` budgets
 * @returns Payload, cache layer for the read path, and inline refresh outcome
 */
export async function getOrBuildNewsFeedMergedPool(args: {
  poolCacheKey: string
  sources: NewsSourceConfig[]
  baseUrl: string
  windowAtMs: number
  itemCategory?: NewsCategory
  listSlug: string
  allowInlinePoolRefresh?: boolean
  handlerDeadlineEpochMs?: number
}): Promise<{
  payload: NewsFeedPoolCachePayload
  poolLayerHit: 'l1' | 'l2' | null
  poolRefreshStatus: NewsFeedPoolRefreshStatus
}> {
  const { poolCacheKey, sources, baseUrl, windowAtMs, itemCategory, listSlug, allowInlinePoolRefresh = false, handlerDeadlineEpochMs } = args

  const inlineAllowed = allowInlineRefreshGivenHandlerBudget(handlerDeadlineEpochMs, allowInlinePoolRefresh)

  if (isAppCacheDisabled()) {
    return coalesceNewsFeedPoolRssByKey(poolCacheKey, async () => {
      const mergeWallDeadlineMs = resolveEffectiveMergeWallDeadlineMs(handlerDeadlineEpochMs)
      const merged = await mergeNewsFeedsToPool(sources, baseUrl, {
        windowAtMs,
        itemCategory,
        listSlug,
        ...(mergeWallDeadlineMs !== undefined ? { mergeWallDeadlineMs } : {}),
      })
      const payload: NewsFeedPoolCachePayload = { ...merged, baseUrl }
      return { payload, poolLayerHit: null, poolRefreshStatus: 'none' }
    })
  }

  const ttlSec = getNewsFeedPoolKvTtlSecondsForListSlug(listSlug)

  const mem = getNewsFeedPoolMemoryCached(poolCacheKey)
  if (mem !== null) {
    const refreshMs = getNewsFeedPoolRefreshIntervalMs()
    if (inlineAllowed && refreshMs > 0 && getNewsFeedPoolPayloadAgeMs(mem) >= refreshMs) {
      return runCoalescedInlineReconcilePool({
        poolCacheKey,
        stalePayload: mem,
        staleLayer: 'l1',
        sources,
        baseUrl,
        itemCategory,
        listSlug,
        handlerDeadlineEpochMs,
      })
    }
    return { payload: mem, poolLayerHit: 'l1', poolRefreshStatus: 'none' }
  }

  const kv = getKvClient()
  if (kv) {
    const raw = await getJsonKv<unknown>(poolCacheKey)
    if (raw !== null && isNewsFeedPoolCachePayload(raw)) {
      setNewsFeedPoolMemoryCached(poolCacheKey, raw, ttlSec)
      const refreshMs = getNewsFeedPoolRefreshIntervalMs()
      if (inlineAllowed && refreshMs > 0 && getNewsFeedPoolPayloadAgeMs(raw) >= refreshMs) {
        return runCoalescedInlineReconcilePool({
          poolCacheKey,
          stalePayload: raw,
          staleLayer: 'l2',
          sources,
          baseUrl,
          itemCategory,
          listSlug,
          handlerDeadlineEpochMs,
        })
      }
      return { payload: raw, poolLayerHit: 'l2', poolRefreshStatus: 'none' }
    }
  }

  return coalesceNewsFeedPoolRssByKey(poolCacheKey, async () => {
    const memAfter = getNewsFeedPoolMemoryCached(poolCacheKey)
    if (memAfter !== null) {
      return { payload: memAfter, poolLayerHit: 'l1', poolRefreshStatus: 'none' }
    }
    if (kv) {
      const rawAfter = await getJsonKv<unknown>(poolCacheKey)
      if (rawAfter !== null && isNewsFeedPoolCachePayload(rawAfter)) {
        setNewsFeedPoolMemoryCached(poolCacheKey, rawAfter, ttlSec)
        return { payload: rawAfter, poolLayerHit: 'l2', poolRefreshStatus: 'none' }
      }
    }
    const mergeWallDeadlineMs = resolveEffectiveMergeWallDeadlineMs(handlerDeadlineEpochMs)
    const merged = await mergeNewsFeedsToPool(sources, baseUrl, {
      windowAtMs,
      itemCategory,
      listSlug,
      ...(mergeWallDeadlineMs !== undefined ? { mergeWallDeadlineMs } : {}),
    })
    const payload: NewsFeedPoolCachePayload = { ...merged, baseUrl }
    if (kv) {
      await setJsonKvEx(poolCacheKey, payload, ttlSec)
    }
    setNewsFeedPoolMemoryCached(poolCacheKey, payload, ttlSec)
    return { payload, poolLayerHit: null, poolRefreshStatus: 'none' }
  })
}

/**
 * Recent-window hours for a pool key (same rule as merge).
 * @param listSubcategoryNorm Flat list slug or empty for the all-pool
 * @returns Hours used in {@link buildNewsFeedPoolCacheKey} and {@link mergeNewsFeedsToPool}
 */
export function resolveNewsFeedPoolRecentWindowHours(listSubcategoryNorm: string): number {
  return getNewsFeedRecentWindowHoursForListSlug(listSubcategoryNorm)
}
