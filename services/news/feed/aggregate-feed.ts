import { createLogger } from '@/services/logger'
import { capItemFeedKeywordList, MAX_POOL_KEYWORD_FACETS } from '@/services/news/config/feed-keyword-budgets'
import { logNewsStructured, NEWS_RSS_MERGE_FLOW } from '@/services/news/structured-news-log'

import { dedupeFacetLabelListForItem, mergeFacetHistogramRowsBySubstring } from '../facets/dedupe-facet-label-substrings'
import { filterPoolByFacetList, type NewsFacetListFilter } from '../facets/facet-list-filter'
import { buildFinalFeedKeywordsForNewsItem } from '../facets/finalize-news-item-topic-keywords'
import { filterRssFacetLabels, shouldDropRssFacetLabel, stripRssFacetLabelsFromAggregatedItem } from '../facets/rss-facet-label-filter'
import { buildPlainDocumentForKeywordCheck, filterFeedKeywordsLiteralInPlain } from '../facets/rss-feed-keyword-document-match'
import {
  getNewsManifestSourceLabelSet,
  stripAggregatedItemRssAnnotationsAgainstOutletNames,
  stripAllAggregatedItemsRssAnnotationsAgainstOutletNames,
  stripFeedCategoriesMatchingOutletNames,
  stripFeedKeywordsMatchingSourceLabels,
} from '../facets/strip-feed-keywords-matching-source-labels'
import { stripRedundantCategoryLikeLabelsFromAggregatedItem, stripRedundantCategoryLikeTopicLabels } from '../facets/strip-redundant-topic-category-labels'
import { normalizeLink } from '../parsing/normalize-link'
import { normalizeTitleKey } from '../parsing/normalize-title'
import { parseRssItems } from '../parsing/parse-rss'
import { sortNewsItemSourceRefsByRegion } from '../region/news-source-region-order'
import { resolveOutletHref } from '../sources/resolve-outlet-href'
import type { AggregatedNewsItem, NewsCategory, NewsFeedFacets, NewsFeedMergeStats, NewsFeedSourceInventoryRow, NewsPlatformTag, NewsSourceConfig, ParsedFeedItem } from '../types'
import { filterToRecentPublished, getNewsFeedRecentWindowHours, getNewsFeedRecentWindowHoursForListSlug, MAX_RECENT_HOURS, MIN_RECENT_HOURS } from './published-recent-window'

const logger = createLogger('news-aggregate')

/** Manifest outlet display names; RSS keywords equal to any label are dropped (avoid duplicating Sources facet). */
const MANIFEST_SOURCE_LABELS_FOR_KEYWORD_STRIP = getNewsManifestSourceLabelSet()

const MIN_TIMEOUT_MS = 5_000
const MAX_TIMEOUT_MS = 120_000
const DEFAULT_TIMEOUT_MS = 30_000

const MIN_CONCURRENCY = 1
/** Upper bound for env override; self-hosted RSSHub (HTTP/HTML routes only) can usually sustain more than public hubs. */
const MAX_CONCURRENCY = 16
const DEFAULT_CONCURRENCY = 8

const MIN_MAX_ATTEMPTS = 1
const MAX_MAX_ATTEMPTS = 5
const DEFAULT_MAX_ATTEMPTS = 3

/**
 * Default merge wall on Vercel when `NEWS_FEED_MERGE_WALL_MS` is unset: **9s** after which no **new** source fetch starts.
 * Aim for ~1s headroom on a **10s** Hobby limit for dedupe, reconcile, prune, and JSON (see `.env.example`).
 * Already-running fetches can still finish later — use lower `NEWS_RSS_FETCH_CONCURRENCY`, cron-warm pools, or `NEWS_FEED_POOL_REFRESH_MS=0` on Hobby if you still hit 504.
 */
const DEFAULT_VERCEL_MERGE_WALL_MS = 9000
const MIN_MERGE_WALL_MS = 1000
const MAX_MERGE_WALL_MS = 115_000

/** HTTP statuses that often clear after a short wait (overload / gateway / rate limit). */
const RETRYABLE_HTTP_STATUSES = new Set([429, 502, 503, 504])

/** User-Agent for upstream RSS requests */
const RSS_USER_AGENT = 'unbnd-news-aggregator/1.0'

/**
 * Cache for parsed `RSSHUB_REQUEST_HEADERS_JSON` so RSS merges do not re-parse on every upstream fetch.
 */
let rsshubRequestHeadersJsonCache: { raw: string | undefined; headers: Record<string, string> | null } = {
  raw: undefined,
  headers: null,
}

/**
 * Parse optional `RSSHUB_REQUEST_HEADERS_JSON` into header entries. Only top-level string values are applied.
 * @returns Extra headers for RSS GETs, or null when unset, invalid, or empty
 */
function parseRsshubRequestHeadersJson(): Record<string, string> | null {
  const raw = process.env.RSSHUB_REQUEST_HEADERS_JSON?.trim()
  if (raw === rsshubRequestHeadersJsonCache.raw) {
    return rsshubRequestHeadersJsonCache.headers
  }
  rsshubRequestHeadersJsonCache.raw = raw
  if (!raw) {
    rsshubRequestHeadersJsonCache.headers = null
    return null
  }
  try {
    const parsed = JSON.parse(raw) as unknown
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      logger.warn('RSSHUB_REQUEST_HEADERS_JSON must be a JSON object; ignoring')
      rsshubRequestHeadersJsonCache.headers = null
      return null
    }
    const out: Record<string, string> = {}
    for (const [key, value] of Object.entries(parsed)) {
      const k = key.trim()
      if (!k || typeof value !== 'string') {
        continue
      }
      out[k] = value
    }
    if (Object.keys(out).length === 0) {
      rsshubRequestHeadersJsonCache.headers = null
      return null
    }
    rsshubRequestHeadersJsonCache.headers = out
    return out
  } catch {
    logger.warn('RSSHUB_REQUEST_HEADERS_JSON is not valid JSON; ignoring')
    rsshubRequestHeadersJsonCache.headers = null
    return null
  }
}

/**
 * Build `fetch` headers for RSSHub (or compatible) GETs. Merges optional `RSSHUB_REQUEST_HEADERS_JSON`
 * (JSON object: header name → string value) for auth gateways, reverse proxies, or e.g. Cloudflare Access
 * service tokens (`CF-Access-Client-Id`, `CF-Access-Client-Secret`). Extra entries override same-named defaults.
 * @returns Header map (never log values — may contain secrets)
 */
function buildNewsRssFetchHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: 'application/rss+xml, application/xml, text/xml, */*',
    'User-Agent': RSS_USER_AGENT,
  }
  const extra = parseRsshubRequestHeadersJson()
  if (extra) {
    Object.assign(headers, extra)
  }
  return headers
}

/**
 * Minimum normalized title length (chars) before same-day title dedupe runs.
 * Shorter titles are too generic for safe cross-feed merging.
 */
const MIN_TITLE_DEDUPE_CHARS = 10

/**
 * Read optional env int with clamp; invalid or missing returns default.
 * @param name Environment variable name
 * @param defaultVal Fallback value
 * @param min Minimum inclusive
 * @param max Maximum inclusive
 * @returns Clamped integer
 */
function parseEnvInt(name: string, defaultVal: number, min: number, max: number): number {
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
 * Per-feed fetch timeout (ms). Browsers do not apply this; slow RSSHub routes often need 20–40s+.
 * @returns Timeout in milliseconds
 */
function getNewsRssFetchTimeoutMs(): number {
  return parseEnvInt('NEWS_RSS_FETCH_TIMEOUT_MS', DEFAULT_TIMEOUT_MS, MIN_TIMEOUT_MS, MAX_TIMEOUT_MS)
}

/**
 * Max concurrent upstream RSS requests to RSSHub. Lower (e.g. 1) if the instance returns 503 under burst load.
 * @returns Integer from 1 through 16 (env `NEWS_RSS_FETCH_CONCURRENCY`, else default 8)
 */
function getNewsRssFetchConcurrency(): number {
  return parseEnvInt('NEWS_RSS_FETCH_CONCURRENCY', DEFAULT_CONCURRENCY, MIN_CONCURRENCY, MAX_CONCURRENCY)
}

/**
 * Max attempts per RSS URL (initial try + retries) for retryable HTTP errors.
 * @returns Attempt count between 1 and 5
 */
function getNewsRssFetchMaxAttempts(): number {
  return parseEnvInt('NEWS_RSS_FETCH_MAX_ATTEMPTS', DEFAULT_MAX_ATTEMPTS, MIN_MAX_ATTEMPTS, MAX_MAX_ATTEMPTS)
}

/**
 * Fragment in {@link mergeNewsFeedsToPool} skip errors when the merge wall-clock budget was exceeded (partial pool).
 * The feed API uses this to set `X-News-Pool-Partial`.
 */
export const NEWS_FEED_MERGE_BUDGET_SKIP_PHRASE = 'merge time budget exceeded (partial pool)'

/**
 * Whether any pool error row indicates a source was skipped due to merge wall budget (partial merge).
 * @param errors Per-source messages from a merged pool
 * @returns True when at least one error is a budget skip
 */
export function newsFeedErrorsIncludeMergeBudgetSkip(errors: readonly { message: string }[] | undefined): boolean {
  if (errors === undefined || errors.length === 0) {
    return false
  }
  return errors.some((e) => e.message.includes(NEWS_FEED_MERGE_BUDGET_SKIP_PHRASE))
}

/**
 * Absolute epoch deadline for HTTP-triggered RSS merges so serverless can return a partial pool before hard runtime limits.
 * Set `NEWS_FEED_MERGE_WALL_MS` to a positive number (milliseconds of wall time from this call). Use `0`, `off`, or `false` to disable.
 * On Vercel (`VERCEL=1`), when the variable is unset, defaults to now + {@link DEFAULT_VERCEL_MERGE_WALL_MS} ms
 * (9s budget for **starting** fetches; ~1s left for post-merge + JSON on a 10s cap).
 * Background/cron merges should omit {@link mergeNewsFeedsToPool}'s `mergeWallDeadlineMs` instead of calling this.
 * @returns Epoch ms when fetches that have not started should be skipped, or `undefined` when uncapped
 */
export function resolveNewsFeedMergeWallDeadlineMs(): number | undefined {
  const raw = process.env.NEWS_FEED_MERGE_WALL_MS?.trim()
  if (raw !== undefined && raw !== '') {
    const lower = raw.toLowerCase()
    if (lower === '0' || lower === 'off' || lower === 'false') {
      return undefined
    }
    const n = Number.parseInt(raw, 10)
    if (!Number.isFinite(n)) {
      return process.env.VERCEL === '1' ? Date.now() + DEFAULT_VERCEL_MERGE_WALL_MS : undefined
    }
    if (n <= 0) {
      return undefined
    }
    const clamped = Math.min(MAX_MERGE_WALL_MS, Math.max(MIN_MERGE_WALL_MS, n))
    return Date.now() + clamped
  }
  if (process.env.VERCEL === '1') {
    return Date.now() + DEFAULT_VERCEL_MERGE_WALL_MS
  }
  return undefined
}

/**
 * Delay before retrying a failed RSS fetch (exponential backoff + jitter).
 * @param failedAttemptIndex Zero-based index of the attempt that failed
 * @returns Milliseconds to wait
 */
function rssFetchRetryDelayMs(failedAttemptIndex: number): number {
  const base = 350 * 2 ** failedAttemptIndex
  return Math.min(10_000, base) + Math.floor(Math.random() * 120)
}

/**
 * Wait for RSS retry backoff.
 * @param ms Sleep duration in milliseconds
 */
async function sleepMs(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Turn fetch failures into clearer log/API messages (AbortError → timeout wording).
 * @param error Caught error
 * @param timeoutMs Timeout used for this request
 * @returns Short message
 */
function formatFetchError(error: unknown, timeoutMs: number): string {
  if (error instanceof Error && error.name === 'AbortError') {
    return `timeout after ${timeoutMs}ms (increase NEWS_RSS_FETCH_TIMEOUT_MS or reduce NEWS_RSS_FETCH_CONCURRENCY if RSSHub is slow)`
  }
  return error instanceof Error ? error.message : String(error)
}

/**
 * Fetch RSS XML text from a URL with timeout.
 * @param url Full feed URL
 * @param timeoutMs Abort after this many milliseconds
 * @returns Response body text
 */
async function fetchRssXml(url: string, timeoutMs: number): Promise<string> {
  const maxAttempts = getNewsRssFetchMaxAttempts()
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)
    try {
      const res = await fetch(url, {
        signal: controller.signal,
        headers: buildNewsRssFetchHeaders(),
      })
      if (!res.ok) {
        try {
          await res.arrayBuffer()
        } catch {
          /* ignore body drain errors */
        }
        if (RETRYABLE_HTTP_STATUSES.has(res.status) && attempt < maxAttempts - 1) {
          await sleepMs(rssFetchRetryDelayMs(attempt))
          continue
        }
        throw new Error(`HTTP ${res.status}`)
      }
      return await res.text()
    } catch (e) {
      if (e instanceof Error && e.name === 'AbortError') {
        throw new Error(`timeout after ${timeoutMs}ms (increase NEWS_RSS_FETCH_TIMEOUT_MS or reduce NEWS_RSS_FETCH_CONCURRENCY if RSSHub is slow)`)
      }
      throw e
    } finally {
      clearTimeout(timer)
    }
  }
  throw new Error('RSS fetch exhausted retries')
}

/**
 * Run one async task per item with at most `limit` tasks in flight (reduces burst load on one RSS host).
 * @param items Work items
 * @param limit Max concurrency (>= 1)
 * @param fn Async work per item
 */
async function runWithConcurrencyLimit<T>(items: T[], limit: number, fn: (item: T) => Promise<void>): Promise<void> {
  const n = Math.max(1, limit)
  if (items.length === 0) {
    return
  }
  let next = 0

  async function worker(): Promise<void> {
    for (;;) {
      const i = next++
      if (i >= items.length) {
        break
      }
      const item = items[i]
      if (item === undefined) {
        break
      }
      await fn(item)
    }
  }

  const workers = Array.from({ length: Math.min(n, items.length) }, () => worker())
  await Promise.all(workers)
}

/**
 * Merged + deduped pool for one RSS session (manifest category slice only; no RSS facet / no pagination).
 * Cache this object; apply `filterPoolByFacetList` + offset/limit when serving.
 */
export interface NewsFeedMergedPool {
  pool: AggregatedNewsItem[]
  facets: NewsFeedFacets
  errors: { sourceId: string; message: string }[]
  /** ISO time anchor for pagination (`feedAnchor`) */
  fetchedAt: string
  /** Rolling-window reference time (ms) used when building `pool` */
  windowAtMs: number
  /** Epoch ms when a full RSS merge or reconcile last wrote this pool (SWR scheduling); absent on legacy cache rows. */
  lastMergedAtMs?: number
  sourcesRequested: number
  sourcesWithItems: number
  sourcesEmptyOrFailed: number
  rawItemCount: number
  droppedMissingLink: number
  duplicateDropped: number
  duplicateDroppedByTitle: number
  droppedOutsideRecentWindow: number
  recentWindowHours: number
  /**
   * Parsed row counts per manifest `source.id` before cross-feed dedupe (latest full fetch).
   * Omitted on legacy cached pools.
   */
  parsedBySourceId?: Record<string, number>
  /** Per-source parsed vs pool counts for API/UI inventory */
  sourceInventory?: NewsFeedSourceInventoryRow[]
}

/**
 * L2/L1 cache row: full merged pool + `baseUrl` for JSON responses.
 */
export type NewsFeedPoolCachePayload = NewsFeedMergedPool & { baseUrl: string }

/**
 * Map source facet id → occurrence count in the merged pool.
 * @param facets Histogram from {@link buildFeedFacetsFromPool}
 * @returns Lookup by `sourceId`
 */
function facetSourceCountMap(facets: NewsFeedFacets): Map<string, number> {
  return new Map(facets.sources.map((x) => [x.sourceId, x.count]))
}

/**
 * Build inventory rows for the requested manifest slice.
 * @param sources Manifest slice (same order as the merge)
 * @param poolCounts Credits in the final pool (from facets)
 * @param parsedBySourceId Parsed rows per id before dedupe; omit when unknown
 * @returns One row per source
 */
function buildSourceInventoryRows(
  sources: NewsSourceConfig[],
  poolCounts: Map<string, number>,
  parsedBySourceId: Record<string, number> | undefined
): NewsFeedSourceInventoryRow[] {
  return sources.map((s) => ({
    sourceId: s.id,
    label: s.label,
    parsedCount: parsedBySourceId?.[s.id] ?? 0,
    poolCount: poolCounts.get(s.id) ?? 0,
  }))
}

/**
 * Fetch all feeds, merge, dedupe, recent window, optional manifest `itemCategory` — **no** RSS facet filter, **no** page slice.
 * @param sources Sources to query (already filtered and sliced)
 * @param baseUrl RSS base (no trailing slash); used only for upstream fetch URLs
 * @param options `windowAtMs` for rolling window + pagination anchor; optional manifest category; `listSlug` for
 *   per-list recent window (empty = global default); optional `mergeWallDeadlineMs` (epoch ms) to skip sources that
 *   have not started fetching after the deadline (partial pool)
 * @returns Full pool and facet histograms over that pool
 */
export async function mergeNewsFeedsToPool(
  sources: NewsSourceConfig[],
  baseUrl: string,
  options: { windowAtMs: number; itemCategory?: NewsCategory; listSlug?: string; mergeWallDeadlineMs?: number }
): Promise<NewsFeedMergedPool> {
  const nowMs = options.windowAtMs
  const errors: { sourceId: string; message: string }[] = []
  const collected: AggregatedNewsItem[] = []
  const sourceHadItems = new Map<string, boolean>()
  const timeoutMs = getNewsRssFetchTimeoutMs()
  const concurrency = getNewsRssFetchConcurrency()

  const parsedCountBySource = new Map<string, number>()
  for (const s of sources) {
    sourceHadItems.set(s.id, false)
    parsedCountBySource.set(s.id, 0)
  }

  const sourceById = new Map<string, NewsSourceConfig>(sources.map((s) => [s.id, s]))

  const mergeBatchStartedAt = Date.now()
  logger.info(
    `RSS merge: ${sources.length} sources, concurrency=${concurrency}, timeoutMs=${timeoutMs}`,
    JSON.stringify({
      flow: 'News merged pool',
      step: 'rss_merge_start',
      event: 'news_rss_merge_start',
      sourceCount: sources.length,
      concurrency,
      timeoutMs,
      maxAttempts: getNewsRssFetchMaxAttempts(),
      sourceIds: sources.map((s) => s.id),
      mergeBatchStartedAt,
    })
  )

  const mergeWallDeadlineMs = options.mergeWallDeadlineMs

  await runWithConcurrencyLimit(sources, concurrency, async (source) => {
    if (mergeWallDeadlineMs !== undefined && Date.now() >= mergeWallDeadlineMs) {
      errors.push({
        sourceId: source.id,
        message: `skipped: ${NEWS_FEED_MERGE_BUDGET_SKIP_PHRASE}`,
      })
      return
    }
    const path = source.rsshubPath.startsWith('/') ? source.rsshubPath : `/${source.rsshubPath}`
    const url = `${baseUrl}${path}`
    const fetchStartedAt = Date.now()
    logNewsStructured(logger, 'info', NEWS_RSS_MERGE_FLOW, `RSS fetch start: ${source.id} — GET ${url}`, 'news_rss_fetch_start', {
      sourceId: source.id,
      sourceLabel: source.label,
      url,
      rsshubPath: path,
      concurrency,
      mergeBatchStartedAt,
      startedAtMs: fetchStartedAt,
    })
    try {
      const xml = await fetchRssXml(url, timeoutMs)
      const parsed = parseRssItems(xml)
      const fetchMs = Date.now() - fetchStartedAt
      if (parsed.length > 0) {
        sourceHadItems.set(source.id, true)
      }
      const rssOkDetail = {
        sourceId: source.id,
        sourceLabel: source.label,
        parsedCount: parsed.length,
        fetchMs,
        rsshubPath: path,
        url,
        concurrency,
        mergeBatchStartedAt,
      }
      const rssOkSummary = `RSS ok: ${source.id} — ${parsed.length} parsed in ${fetchMs}ms`
      if (parsed.length === 0) {
        logNewsStructured(logger, 'warn', NEWS_RSS_MERGE_FLOW, rssOkSummary, 'news_rss_fetch_ok', rssOkDetail)
      } else {
        logNewsStructured(logger, 'ok', NEWS_RSS_MERGE_FLOW, rssOkSummary, 'news_rss_fetch_ok', rssOkDetail)
      }
      for (const row of parsed) {
        parsedCountBySource.set(source.id, (parsedCountBySource.get(source.id) ?? 0) + 1)
        collected.push(attachMeta(row, source))
      }
    } catch (e) {
      const fetchMs = Date.now() - fetchStartedAt
      const message = formatFetchError(e, timeoutMs)
      const sourceFailSummary = `RSS source "${source.id}" failed — ${message}`
      logNewsStructured(logger, 'warn', NEWS_RSS_MERGE_FLOW, sourceFailSummary, 'news_feed_source_failed', {
        sourceId: source.id,
        fetchMs,
        url,
        concurrency,
        mergeBatchStartedAt,
        errorDetail: message,
      })
      errors.push({ sourceId: source.id, message })
    }
  })

  const { uniqueItems: afterUrlDedupe, droppedMissingLink, duplicateDropped } = dedupeByNormalizedLinkWithStats(collected, sourceById)
  const { uniqueItems: mergedItems, duplicateDroppedByTitle } = dedupeBySameDayTitleAcrossSources(afterUrlDedupe, sourceById)
  mergedItems.sort((a, b) => compareFeedRowsNewestFirst(a, b))
  const listSlugNorm = options.listSlug?.trim() ?? ''
  const recentHours = getNewsFeedRecentWindowHoursForListSlug(listSlugNorm)
  const { kept: recentItems, droppedOutsideRecentWindow } = filterToRecentPublished(mergedItems, recentHours, nowMs)
  attachPlatformTags(recentItems, sourceById)
  stripAllAggregatedItemsRssAnnotationsAgainstOutletNames(recentItems, MANIFEST_SOURCE_LABELS_FOR_KEYWORD_STRIP)
  const itemCategory = options.itemCategory
  const pool = itemCategory !== undefined ? recentItems.filter((row) => row.category === itemCategory) : recentItems
  const facets = buildFeedFacetsFromPool(pool)
  const parsedBySourceId = Object.fromEntries(sources.map((s) => [s.id, parsedCountBySource.get(s.id) ?? 0]))
  const poolFacetMap = facetSourceCountMap(facets)
  const sourceInventory = buildSourceInventoryRows(sources, poolFacetMap, parsedBySourceId)

  const sourcesWithItems = [...sourceHadItems.values()].filter(Boolean).length
  const sourcesFailedIds = new Set(errors.map((e) => e.sourceId))
  const sourcesEmptyOrFailed = sources.filter((s) => sourcesFailedIds.has(s.id) || !sourceHadItems.get(s.id)).length

  return {
    pool,
    facets,
    errors,
    fetchedAt: new Date(nowMs).toISOString(),
    windowAtMs: nowMs,
    lastMergedAtMs: nowMs,
    sourcesRequested: sources.length,
    sourcesWithItems,
    sourcesEmptyOrFailed,
    rawItemCount: collected.length,
    droppedMissingLink,
    duplicateDropped,
    duplicateDroppedByTitle,
    droppedOutsideRecentWindow,
    recentWindowHours: recentHours,
    parsedBySourceId,
    sourceInventory,
  }
}

/**
 * Drop articles outside the rolling recent window relative to `windowAtMs`, rebuild facet histograms, and align
 * `fetchedAt` for pagination.
 * Merge diagnostics (`droppedOutsideRecentWindow`, `duplicateDropped`, etc.) describe how the pool was **built**;
 * this pass only shrinks `pool` for the request anchor and must not overwrite those counters (otherwise logs show
 * e.g. `raw=30` / `deduped=7` with `droppedWindow=0`).
 * @param payload Cached or fresh pool row
 * @param windowAtMs Request anchor (from `feedAnchor` or current time)
 * @returns New payload (does not mutate input)
 */
export function pruneNewsFeedPoolPayloadForWindow(payload: NewsFeedPoolCachePayload, windowAtMs: number): NewsFeedPoolCachePayload {
  const recentHours =
    typeof payload.recentWindowHours === 'number' && Number.isFinite(payload.recentWindowHours)
      ? Math.min(MAX_RECENT_HOURS, Math.max(MIN_RECENT_HOURS, payload.recentWindowHours))
      : getNewsFeedRecentWindowHours()
  const { kept } = filterToRecentPublished(payload.pool, recentHours, windowAtMs)
  const facets = buildFeedFacetsFromPool(kept)
  const poolFacetMap = facetSourceCountMap(facets)
  let sourceInventory = payload.sourceInventory
  if (sourceInventory !== undefined && sourceInventory.length > 0) {
    sourceInventory = sourceInventory.map((row) => ({
      ...row,
      poolCount: poolFacetMap.get(row.sourceId) ?? 0,
    }))
  }
  return {
    ...payload,
    pool: kept,
    facets,
    fetchedAt: new Date(windowAtMs).toISOString(),
    windowAtMs,
    sourceInventory,
  }
}

/**
 * Recompute each item's `feedKeywords` from RSS-only refinement (no segmentation) and rebuild pool facet histograms.
 * Call on every HTTP/MCP response after {@link pruneNewsFeedPoolPayloadForWindow} so L1/L2 cache picks up updated rules.
 * @param payload Pruned pool row (or any payload with `pool` + optional `sourceInventory`)
 * @returns New payload; does not mutate input
 */
export function attachFinalizedTopicKeywordsToNewsPool(payload: NewsFeedPoolCachePayload): NewsFeedPoolCachePayload {
  const pool = payload.pool.map((item) => {
    const kws = buildFinalFeedKeywordsForNewsItem(item)
    const next: AggregatedNewsItem = { ...item }
    if (kws.length > 0) {
      next.feedKeywords = kws
    } else {
      delete next.feedKeywords
    }
    stripRedundantCategoryLikeLabelsFromAggregatedItem(next)
    return next
  })
  const facets = buildFeedFacetsFromPool(pool)
  const poolFacetMap = facetSourceCountMap(facets)
  let sourceInventory = payload.sourceInventory
  if (sourceInventory !== undefined && sourceInventory.length > 0) {
    sourceInventory = sourceInventory.map((row) => ({
      ...row,
      poolCount: poolFacetMap.get(row.sourceId) ?? 0,
    }))
  }
  return {
    ...payload,
    pool,
    facets,
    sourceInventory,
  }
}

/**
 * Merge a previously cached pool with a fresh RSS merge: dedupe again, sort, apply rolling window from “now”, optional manifest category.
 * @param args Previous rows, fresh merge result, manifest sources, optional article taxonomy filter
 * @returns New merged pool stats suitable for L1/L2 storage
 */
export function reconcileNewsFeedPoolAfterRssFetch(args: {
  previousItems: AggregatedNewsItem[]
  fresh: NewsFeedMergedPool
  sources: NewsSourceConfig[]
  itemCategory?: NewsCategory
}): NewsFeedMergedPool {
  const { previousItems, fresh, sources, itemCategory } = args
  const sourceById = new Map(sources.map((s) => [s.id, s]))
  const combined = [...previousItems, ...fresh.pool]
  const { uniqueItems: afterUrlDedupe, droppedMissingLink, duplicateDropped } = dedupeByNormalizedLinkWithStats(combined, sourceById)
  const { uniqueItems: mergedItems, duplicateDroppedByTitle } = dedupeBySameDayTitleAcrossSources(afterUrlDedupe, sourceById)
  mergedItems.sort((a, b) => compareFeedRowsNewestFirst(a, b))
  const recentHours = fresh.recentWindowHours
  const nowMs = Date.now()
  const { kept: recentItems, droppedOutsideRecentWindow } = filterToRecentPublished(mergedItems, recentHours, nowMs)
  attachPlatformTags(recentItems, sourceById)
  stripAllAggregatedItemsRssAnnotationsAgainstOutletNames(recentItems, MANIFEST_SOURCE_LABELS_FOR_KEYWORD_STRIP)
  const pool = itemCategory !== undefined ? recentItems.filter((row) => row.category === itemCategory) : recentItems
  const facets = buildFeedFacetsFromPool(pool)
  const poolFacetMap = facetSourceCountMap(facets)
  const sourceInventory = buildSourceInventoryRows(sources, poolFacetMap, fresh.parsedBySourceId)
  return {
    pool,
    facets,
    errors: fresh.errors,
    fetchedAt: new Date(nowMs).toISOString(),
    windowAtMs: nowMs,
    lastMergedAtMs: nowMs,
    sourcesRequested: fresh.sourcesRequested,
    sourcesWithItems: fresh.sourcesWithItems,
    sourcesEmptyOrFailed: fresh.sourcesEmptyOrFailed,
    rawItemCount: combined.length,
    droppedMissingLink,
    duplicateDropped,
    duplicateDroppedByTitle,
    droppedOutsideRecentWindow,
    recentWindowHours: recentHours,
    parsedBySourceId: fresh.parsedBySourceId,
    sourceInventory,
  }
}

/**
 * Merge a partial RSS retry (failed sources only) into the cached pool: same dedupe/window as full reconcile,
 * but **errors** drop previous rows for retried `sourceId`s and append the partial merge’s errors.
 * @param args Previous pool rows, previous API errors, merge result for retried sources only, ids that were retried, full manifest slice, optional category filter
 * @returns Merged pool row for L1/L2
 */
export function reconcileNewsFeedPoolAfterFailedSourceRetry(args: {
  previousItems: AggregatedNewsItem[]
  previousErrors: { sourceId: string; message: string }[]
  freshPartial: NewsFeedMergedPool
  retriedSourceIds: string[]
  allSources: NewsSourceConfig[]
  itemCategory?: NewsCategory
  /** When set, parsed counts for non-retried sources are preserved (partial HTTP retry). */
  previousParsedBySourceId?: Record<string, number>
}): NewsFeedMergedPool {
  const { previousItems, previousErrors, freshPartial, retriedSourceIds, allSources, itemCategory, previousParsedBySourceId } = args
  const retried = new Set(retriedSourceIds)
  const sourceById = new Map(allSources.map((s) => [s.id, s]))
  const combined = [...previousItems, ...freshPartial.pool]
  const { uniqueItems: afterUrlDedupe, droppedMissingLink, duplicateDropped } = dedupeByNormalizedLinkWithStats(combined, sourceById)
  const { uniqueItems: mergedItems, duplicateDroppedByTitle } = dedupeBySameDayTitleAcrossSources(afterUrlDedupe, sourceById)
  mergedItems.sort((a, b) => compareFeedRowsNewestFirst(a, b))
  const recentHours = freshPartial.recentWindowHours
  const nowMs = Date.now()
  const { kept: recentItems, droppedOutsideRecentWindow } = filterToRecentPublished(mergedItems, recentHours, nowMs)
  attachPlatformTags(recentItems, sourceById)
  stripAllAggregatedItemsRssAnnotationsAgainstOutletNames(recentItems, MANIFEST_SOURCE_LABELS_FOR_KEYWORD_STRIP)
  const pool = itemCategory !== undefined ? recentItems.filter((row) => row.category === itemCategory) : recentItems
  const facets = buildFeedFacetsFromPool(pool)

  const mergedErrors = [...previousErrors.filter((e) => !retried.has(e.sourceId)), ...freshPartial.errors]
  const poolFacetMap = facetSourceCountMap(facets)
  const failedSourceIds = new Set(mergedErrors.map((e) => e.sourceId))
  let sourcesWithItems = 0
  let sourcesEmptyOrFailed = 0
  for (const s of allSources) {
    const hasPoolCredit = (poolFacetMap.get(s.id) ?? 0) > 0
    if (hasPoolCredit && !failedSourceIds.has(s.id)) {
      sourcesWithItems++
    } else {
      sourcesEmptyOrFailed++
    }
  }
  const mergedParsedBySourceId: Record<string, number> = {
    ...(previousParsedBySourceId ?? {}),
    ...(freshPartial.parsedBySourceId ?? {}),
  }
  const sourceInventory = buildSourceInventoryRows(allSources, poolFacetMap, mergedParsedBySourceId)

  return {
    pool,
    facets,
    errors: mergedErrors,
    fetchedAt: new Date(nowMs).toISOString(),
    windowAtMs: nowMs,
    lastMergedAtMs: nowMs,
    sourcesRequested: allSources.length,
    sourcesWithItems,
    sourcesEmptyOrFailed,
    rawItemCount: combined.length,
    droppedMissingLink,
    duplicateDropped,
    duplicateDroppedByTitle,
    droppedOutsideRecentWindow,
    recentWindowHours: recentHours,
    parsedBySourceId: mergedParsedBySourceId,
    sourceInventory,
  }
}

/**
 * Apply optional RSS facet filter + pagination slice on a cached or fresh merged pool.
 * @param payload Pool + resolved `baseUrl`
 * @param options Facet filter, offset, limit
 * @returns Same shape as {@link aggregateNewsFeeds}
 */
export function sliceNewsFeedPageFromPool(
  payload: NewsFeedPoolCachePayload,
  options: {
    facetListFilter?: NewsFacetListFilter
    itemOffset: number
    itemLimit: number
  }
): {
  items: AggregatedNewsItem[]
  errors: { sourceId: string; message: string }[]
  fetchedAt: string
  baseUrl: string
  mergeStats: NewsFeedMergeStats
  facets: NewsFeedFacets
  sourceInventory?: NewsFeedSourceInventoryRow[]
} {
  const {
    pool,
    facets,
    errors,
    fetchedAt,
    baseUrl,
    sourcesRequested,
    sourcesWithItems,
    sourcesEmptyOrFailed,
    rawItemCount,
    droppedMissingLink,
    duplicateDropped,
    duplicateDroppedByTitle,
    droppedOutsideRecentWindow,
    recentWindowHours,
    sourceInventory,
  } = payload

  const listPool = options.facetListFilter !== undefined ? filterPoolByFacetList(pool, options.facetListFilter) : pool
  const uniqueAfterDedupe = listPool.length
  const safeOffset = Math.max(0, Math.min(options.itemOffset, uniqueAfterDedupe))
  const items = listPool.slice(safeOffset, safeOffset + options.itemLimit).map((row) => {
    const sanitized = stripRssFacetLabelsFromAggregatedItem(row)
    stripAggregatedItemRssAnnotationsAgainstOutletNames(sanitized, MANIFEST_SOURCE_LABELS_FOR_KEYWORD_STRIP)
    return sanitized
  })
  const hasMore = safeOffset + items.length < uniqueAfterDedupe
  const truncatedByLimit = Math.max(0, uniqueAfterDedupe - safeOffset - items.length)

  const mergeStats: NewsFeedMergeStats = {
    sourcesRequested,
    sourcesWithItems,
    sourcesEmptyOrFailed,
    rawItemCount,
    droppedMissingLink,
    duplicateDropped,
    duplicateDroppedByTitle,
    droppedOutsideRecentWindow,
    recentWindowHours,
    uniqueAfterDedupe,
    offset: safeOffset,
    hasMore,
    returnedItems: items.length,
    truncatedByLimit,
  }

  return {
    items,
    errors,
    fetchedAt,
    baseUrl,
    mergeStats,
    facets,
    sourceInventory,
  }
}

/**
 * Merge items from several feeds: dedupe by normalized link and same-day title (cross-source),
 * sort by `publishedAt` descending, then keep items in a rolling recent window (default last 24h).
 * @param sources Sources to query (already filtered and sliced)
 * @param baseUrl RSS base (no trailing slash)
 * @param itemLimit Max items in this page (slice length)
 * @param itemOffset Skip this many rows after sort/today filter (for pagination)
 * @param options Optional `windowAtMs`, `itemCategory`, `listSlug` (recent window), `mergeWallDeadlineMs`, and/or `facetListFilter`
 *   (RSS category / keyword / source id — after pool build; facets stay over full pool)
 * @returns Items, per-source errors, ISO fetch timestamp, merge diagnostics
 */
export async function aggregateNewsFeeds(
  sources: NewsSourceConfig[],
  baseUrl: string,
  itemLimit: number,
  itemOffset = 0,
  options?: {
    windowAtMs?: number
    itemCategory?: NewsCategory
    listSlug?: string
    facetListFilter?: NewsFacetListFilter
    mergeWallDeadlineMs?: number
  }
): Promise<{
  items: AggregatedNewsItem[]
  errors: { sourceId: string; message: string }[]
  fetchedAt: string
  mergeStats: NewsFeedMergeStats
  facets: NewsFeedFacets
  sourceInventory?: NewsFeedSourceInventoryRow[]
}> {
  const windowAtMs = options?.windowAtMs ?? Date.now()
  const merged = await mergeNewsFeedsToPool(sources, baseUrl, {
    windowAtMs,
    itemCategory: options?.itemCategory,
    listSlug: options?.listSlug,
    mergeWallDeadlineMs: options?.mergeWallDeadlineMs,
  })
  return sliceNewsFeedPageFromPool({ ...merged, baseUrl }, { facetListFilter: options?.facetListFilter, itemOffset, itemLimit })
}

/**
 * Trim RSS labels and drop denylisted entries for facet counting.
 * @param values Optional category or keyword list from one item
 * @returns Non-empty trimmed labels that pass {@link shouldDropRssFacetLabel}
 */
function collectTrimmedFacetLabelsForCount(values: readonly string[] | undefined): string[] {
  const out: string[] = []
  for (const raw of values ?? []) {
    const t = raw.trim()
    if (!t || shouldDropRssFacetLabel(t)) {
      continue
    }
    out.push(t)
  }
  return out
}

/**
 * Build RSS category / keyword / source facet counts over the full merged pool (before pagination).
 * Categories: each distinct label on an item counts at most once (per-item dedupe). Keywords: **topic union**
 * of `feedCategories` ∪ `feedKeywords` per item, deduped once per item, so the same string in both fields does not
 * double-count and sidebar totals align with “articles carrying this topic”. Rows are capped by {@link MAX_POOL_KEYWORD_FACETS}.
 * @param pool Rows after dedupe, sort, recent window, and optional article-category filter
 * @returns Sorted facet lists for API clients
 */
export function buildFeedFacetsFromPool(pool: AggregatedNewsItem[]): NewsFeedFacets {
  const fcMap = new Map<string, number>()
  const fkMap = new Map<string, number>()
  const srcMap = new Map<string, { label: string; count: number }>()

  for (const item of pool) {
    const catRaw = collectTrimmedFacetLabelsForCount(item.feedCategories)
    const kwRaw = collectTrimmedFacetLabelsForCount(item.feedKeywords)
    const cats = dedupeFacetLabelListForItem(catRaw)
    for (const t of cats) {
      fcMap.set(t, (fcMap.get(t) ?? 0) + 1)
    }
    const topicUnion = dedupeFacetLabelListForItem([...catRaw, ...kwRaw])
    for (const t of topicUnion) {
      fkMap.set(t, (fkMap.get(t) ?? 0) + 1)
    }
    const seenSrc = new Set<string>()
    const bumpSrc = (id: string, label: string) => {
      if (seenSrc.has(id)) {
        return
      }
      seenSrc.add(id)
      const cur = srcMap.get(id)
      if (cur) {
        cur.count += 1
      } else {
        srcMap.set(id, { label, count: 1 })
      }
    }
    bumpSrc(item.sourceId, item.sourceLabel)
    for (const t of item.platformTags ?? []) {
      bumpSrc(t.sourceId, t.sourceLabel)
    }
    for (const s of item.alsoFromSources ?? []) {
      bumpSrc(s.sourceId, s.sourceLabel)
    }
  }

  const categories = mergeFacetHistogramRowsBySubstring([...fcMap.entries()].map(([value, count]) => ({ value, count })))
  /**
   * `feedKeyword` facets must keep exact canonical-topic semantics so the sidebar count matches
   * the number of rows returned by `?keyword=<value>`.
   */
  const keywords = [...fkMap.entries()]
    .map(([value, count]) => ({ value, count }))
    .sort((a, b) => b.count - a.count || a.value.localeCompare(b.value))
    .slice(0, MAX_POOL_KEYWORD_FACETS)
  const sources = [...srcMap.entries()].map(([sourceId, { label, count }]) => ({ sourceId, label, count })).sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))

  return { categories, keywords, sources }
}

/**
 * Attach source metadata to a parsed row.
 * @param row Parsed RSS fields
 * @param source Manifest row
 * @returns Aggregated item
 */
function attachMeta(row: ParsedFeedItem, source: NewsSourceConfig): AggregatedNewsItem {
  const item: AggregatedNewsItem = {
    title: row.title,
    link: row.link,
    publishedAt: row.publishedAt,
    summary: row.summary,
    sourceId: source.id,
    sourceLabel: source.label,
    category: source.category,
    region: source.region,
  }
  if (row.imageUrl?.trim()) {
    item.imageUrl = row.imageUrl.trim()
  }
  if (row.feedCategories?.length) {
    const catStripped = stripRedundantCategoryLikeTopicLabels(
      stripFeedCategoriesMatchingOutletNames(dedupeLabelList(row.feedCategories), source.label, MANIFEST_SOURCE_LABELS_FOR_KEYWORD_STRIP)
    )
    const cats = dedupeFacetLabelListForItem(filterRssFacetLabels(catStripped))
    if (cats.length > 0) {
      item.feedCategories = cats
    }
  }
  const rssKwNormalized = row.feedKeywords?.length ? dedupeLabelList(row.feedKeywords) : []
  const plainDoc = buildPlainDocumentForKeywordCheck(row.title, row.summary)
  let keywordCandidates: string[] = []
  if (rssKwNormalized.length > 0) {
    keywordCandidates = filterFeedKeywordsLiteralInPlain(rssKwNormalized, plainDoc)
  }
  keywordCandidates = filterFeedKeywordsLiteralInPlain(keywordCandidates, plainDoc)
  if (keywordCandidates.length > 0) {
    const stripped = stripRedundantCategoryLikeTopicLabels(stripFeedKeywordsMatchingSourceLabels(keywordCandidates, source.label, MANIFEST_SOURCE_LABELS_FOR_KEYWORD_STRIP))
    const kws = capItemFeedKeywordList(dedupeFacetLabelListForItem(filterRssFacetLabels(stripped)))
    if (kws.length > 0) {
      item.feedKeywords = kws
    }
  }
  return item
}

/**
 * Dedupe trimmed strings preserving order.
 * @param values Input strings
 * @returns Deduped list
 */
function dedupeLabelList(values: string[]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const v of values) {
    const t = v.trim()
    if (!t || seen.has(t)) {
      continue
    }
    seen.add(t)
    out.push(t)
  }
  return out
}

/**
 * Union RSS `feedCategories` / `feedKeywords` when folding duplicate rows into the kept item.
 * @param kept Row retained for dedupe
 * @param incoming Row being merged in (same story, other feed or duplicate row)
 */
function mergeFeedAnnotations(kept: AggregatedNewsItem, incoming: AggregatedNewsItem): void {
  const cats = dedupeFacetLabelListForItem(filterRssFacetLabels(dedupeLabelList([...(kept.feedCategories ?? []), ...(incoming.feedCategories ?? [])])))
  const mergedPlain = `${buildPlainDocumentForKeywordCheck(kept.title, kept.summary)} ${buildPlainDocumentForKeywordCheck(incoming.title, incoming.summary)}`
    .replace(/\s+/g, ' ')
    .trim()
  let kws = dedupeLabelList([...(kept.feedKeywords ?? []), ...(incoming.feedKeywords ?? [])])
  kws = capItemFeedKeywordList(dedupeFacetLabelListForItem(filterRssFacetLabels(kws)))
  kws = filterFeedKeywordsLiteralInPlain(kws, mergedPlain)
  if (!kept.imageUrl?.trim() && incoming.imageUrl?.trim()) {
    kept.imageUrl = incoming.imageUrl.trim()
  }
  if (cats.length > 0) {
    kept.feedCategories = cats
  } else {
    delete kept.feedCategories
  }
  if (kws.length > 0) {
    kept.feedKeywords = kws
  } else {
    delete kept.feedKeywords
  }
  stripAggregatedItemRssAnnotationsAgainstOutletNames(kept, MANIFEST_SOURCE_LABELS_FOR_KEYWORD_STRIP)
}

/**
 * Build ordered platform tags (primary + merged outlets) with resolved hrefs for clients without the manifest.
 * @param items Rows after dedupe and sort
 * @param sourceById Manifest lookup by source id
 */
function attachPlatformTags(items: AggregatedNewsItem[], sourceById: Map<string, NewsSourceConfig>): void {
  for (const item of items) {
    if (!item.alsoFromSources?.length) {
      continue
    }
    item.alsoFromSources = sortNewsItemSourceRefsByRegion(item.alsoFromSources, sourceById)
    const primaryCfg = sourceById.get(item.sourceId)
    const primaryHref = resolveOutletHref(item.link, primaryCfg)
    const tags: NewsPlatformTag[] = [
      {
        sourceId: item.sourceId,
        sourceLabel: item.sourceLabel,
        href: primaryHref,
      },
      ...item.alsoFromSources.map((r) => ({
        sourceId: r.sourceId,
        sourceLabel: r.sourceLabel,
        href: r.href,
      })),
    ]
    item.platformTags = tags
  }
}

/**
 * UTC calendar date (YYYY-MM-DD) for same-day title clustering; empty when missing or invalid.
 * @param iso `publishedAt` from RSS
 * @returns Date string or empty
 */
function publishedDayUtc(iso: string | null): string {
  if (!iso) {
    return ''
  }
  const t = Date.parse(iso)
  if (Number.isNaN(t)) {
    return ''
  }
  return new Date(t).toISOString().slice(0, 10)
}

/**
 * Merge rows from different sources when the normalized title matches on the same UTC day but links differ.
 * Skips rows with short titles or without a parseable date (avoids false merges).
 * @param items Rows already unique by normalized URL
 * @returns Deduplicated list and how many rows were folded by title
 */
function dedupeBySameDayTitleAcrossSources(
  items: AggregatedNewsItem[],
  sourceById: Map<string, NewsSourceConfig>
): {
  uniqueItems: AggregatedNewsItem[]
  duplicateDroppedByTitle: number
} {
  const seen = new Map<string, AggregatedNewsItem>()
  const passthrough: AggregatedNewsItem[] = []
  let duplicateDroppedByTitle = 0

  for (const row of items) {
    const tk = normalizeTitleKey(row.title)
    if (tk.length < MIN_TITLE_DEDUPE_CHARS) {
      passthrough.push(row)
      continue
    }
    const day = publishedDayUtc(row.publishedAt)
    if (!day) {
      passthrough.push(row)
      continue
    }
    const key = `${day}::${tk}`
    const existing = seen.get(key)
    if (existing !== undefined) {
      if (existing.sourceId === row.sourceId) {
        let n = 1
        let altKey = `${key}::__${existing.sourceId}__${n}`
        while (seen.has(altKey)) {
          n++
          altKey = `${key}::__${existing.sourceId}__${n}`
        }
        seen.set(altKey, row)
      } else {
        duplicateDroppedByTitle++
        appendDistinctMergedSource(existing, row, sourceById)
      }
      continue
    }
    seen.set(key, row)
  }

  return {
    uniqueItems: [...seen.values(), ...passthrough],
    duplicateDroppedByTitle,
  }
}

/**
 * Append another outlet to the kept row when the same story appears in a different feed.
 * @param kept Row kept for this dedupe key
 * @param duplicate Row dropped but contributes attribution + link
 * @param sourceById Manifest rows for default URLs
 */
function appendDistinctMergedSource(kept: AggregatedNewsItem, duplicate: AggregatedNewsItem, sourceById: Map<string, NewsSourceConfig>): void {
  mergeFeedAnnotations(kept, duplicate)
  if (duplicate.sourceId === kept.sourceId) {
    return
  }
  if (!kept.alsoFromSources) {
    kept.alsoFromSources = []
  }
  if (kept.alsoFromSources.some((r) => r.sourceId === duplicate.sourceId)) {
    return
  }
  const dupCfg = sourceById.get(duplicate.sourceId)
  const href = resolveOutletHref(duplicate.link, dupCfg)
  kept.alsoFromSources.push({
    sourceId: duplicate.sourceId,
    sourceLabel: duplicate.sourceLabel,
    href,
  })
}

/**
 * Keep first occurrence per normalized URL; count missing links and duplicate URLs.
 * @param rows Merged rows from all feeds
 * @returns Unique items and drop counts
 */
function dedupeByNormalizedLinkWithStats(
  rows: AggregatedNewsItem[],
  sourceById: Map<string, NewsSourceConfig>
): {
  uniqueItems: AggregatedNewsItem[]
  droppedMissingLink: number
  duplicateDropped: number
} {
  const seen = new Map<string, AggregatedNewsItem>()
  let droppedMissingLink = 0
  let duplicateDropped = 0
  for (const row of rows) {
    const key = normalizeLink(row.link)
    if (!key) {
      droppedMissingLink++
      continue
    }
    if (seen.has(key)) {
      duplicateDropped++
      const kept = seen.get(key)
      if (kept !== undefined) {
        appendDistinctMergedSource(kept, row, sourceById)
      }
      continue
    }
    seen.set(key, row)
  }
  return {
    uniqueItems: [...seen.values()],
    droppedMissingLink,
    duplicateDropped,
  }
}

/**
 * Timestamp for sorting (newer first); missing dates last.
 * @param row Item with optional publishedAt
 * @returns Epoch ms
 */
function sortKey(row: AggregatedNewsItem): number {
  if (!row.publishedAt) {
    return 0
  }
  const t = Date.parse(row.publishedAt)
  return Number.isNaN(t) ? 0 : t
}

/**
 * Stable ordering for merged feeds: newer `publishedAt` first; ties use link then `sourceId`
 * so pagination slices stay consistent across requests (RSS fetch completion order varies).
 * @param a First row
 * @param b Second row
 * @returns Comparator result for Array.sort
 */
function compareFeedRowsNewestFirst(a: AggregatedNewsItem, b: AggregatedNewsItem): number {
  const diff = sortKey(b) - sortKey(a)
  if (diff !== 0) {
    return diff
  }
  const linkCmp = (a.link || '').localeCompare(b.link || '', 'en')
  if (linkCmp !== 0) {
    return linkCmp
  }
  return a.sourceId.localeCompare(b.sourceId)
}
