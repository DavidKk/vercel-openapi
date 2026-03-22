import { api } from '@/initializer/controller'
import { jsonForbidden, jsonInvalidParameters, jsonSuccess } from '@/initializer/response'
import { getAuthSession } from '@/services/auth/session'
import { createLogger } from '@/services/logger'
import { getNewsCategoryForListSlug, isValidNewsListSlug, normalizeNewsSubcategory } from '@/services/news/config/news-subcategories'
import type { NewsFacetListFilter } from '@/services/news/facets/facet-list-filter'
import type { NewsFeedPoolCachePayload } from '@/services/news/feed/aggregate-feed'
import {
  attachFinalizedTopicKeywordsToNewsPool,
  newsFeedErrorsIncludeMergeBudgetSkip,
  pruneNewsFeedPoolPayloadForWindow,
  sliceNewsFeedPageFromPool,
} from '@/services/news/feed/aggregate-feed'
import {
  applyRetrySourcesToNewsFeedPool,
  buildNewsFeedPoolCacheKey,
  createEmptyDeadlinePoolPayload,
  getNewsFeedHandlerTailReserveMs,
  getNewsFeedHttpHandlerBudgetMs,
  getNewsFeedHttpHandlerDeadlineEpochMs,
  getOrBuildNewsFeedMergedPool,
  type NewsFeedHandlerDeadlineStatus,
  type NewsFeedPoolRefreshStatus,
  resolveNewsFeedPoolRecentWindowHours,
  resolveNewsFeedWindowMs,
  tryReadNewsFeedPoolFromCacheOnly,
} from '@/services/news/feed/feed-kv-cache'
import { NEWS_FEED_WARMUP_MANUAL_UNLOCK_SECONDS, NEWS_FEED_WARMUP_POLL_INTERVAL_SECONDS, splitNewsFeedPoolErrors } from '@/services/news/feed/news-feed-source-issue'
import { resolveNewsFeedRegionAccess } from '@/services/news/region/news-feed-region-access'
import { filterNewsSources, getNewsFeedBaseUrl, isValidNewsCategory, isValidNewsRegion } from '@/services/news/sources/sources'
import { logNewsStructured, NEWS_FEED_API_FLOW } from '@/services/news/structured-news-log'
import type { NewsCategory, NewsRegion, NewsSourceConfig } from '@/services/news/types'

/** Node runtime: merged pool is built or read from cache synchronously before the JSON response (no post-response RSS jobs). */
export const runtime = 'nodejs'

/**
 * Allows longer RSS merge on supported plans; cache-miss merges still honor `NEWS_FEED_MERGE_WALL_MS` (partial pool when budget is exceeded).
 * Hobby may remain capped at 10s regardless.
 */
export const maxDuration = 60

const logger = createLogger('api-news-feed')

/** Same as geo API: `X-Cache-Hit` = `L1` (memory) or `L2` (KV). Omitted when the merged pool was built fresh (miss). */
const HEADER_CACHE_HIT = 'X-Cache-Hit'

/** Set when at least one source was skipped before fetch due to merge wall budget (partial pool). */
const HEADER_POOL_PARTIAL = 'X-News-Pool-Partial'

/** Set when the handler kept the previous L1/L2 pool after an inline RSS refresh threw (stale-safe). */
const HEADER_POOL_STALE = 'X-News-Pool-Stale'

/** Set when this request ran an inline reconcile refresh successfully (`X-Cache-Hit` may be absent). */
const HEADER_POOL_REFRESH_INLINE = 'X-News-Pool-Refresh'

/** `cache_only` | `empty_timeout` when the HTTP handler pool budget was exhausted before `getOrBuild` finished (see `NEWS_FEED_HANDLER_DEADLINE_MS`). */
const HEADER_FEED_DEADLINE_STATUS = 'X-News-Feed-Deadline-Status'

/** Set when the request used `retrySourceIds` and merged RSS for those ids only into the pool. */
const HEADER_PARTIAL_RETRY = 'X-News-Feed-Partial-Retry'

const DEFAULT_ITEM_LIMIT = 30
const MAX_ITEM_LIMIT = 100
const DEFAULT_MAX_FEEDS = 15
const MAX_MAX_FEEDS = 25
/** Max `offset` to limit work per request (slice only; full merge still runs). */
const MAX_ITEM_OFFSET = 2000

const POSITIVE_INT_RE = /^\d+$/

/** Short human label for where the merged pool came from (for logs). */
function describeNewsFeedPoolSource(poolLayerHit: 'l1' | 'l2' | null): string {
  if (poolLayerHit === 'l1') {
    return 'in-memory cache (L1)'
  }
  if (poolLayerHit === 'l2') {
    return 'KV cache (L2)'
  }
  return 'fresh RSS merge (cache miss)'
}

/** Max length for `feedCategory` / `feedKeyword` query values */
const MAX_FACET_LABEL_LEN = 200
/** Max length for `feedSourceId` */
const MAX_FEED_SOURCE_ID_LEN = 80
/** Manifest source ids: word chars and hyphen only */
const FEED_SOURCE_ID_RE = /^[\w-]+$/

/**
 * At most one of `feedCategory`, `feedKeyword`, `feedSourceId` may be set; used to filter the merged pool before pagination.
 * @param searchParams Request query
 * @returns Filter object, undefined if none, or `invalid`
 */
function parseFacetListFilterFromQuery(searchParams: URLSearchParams): NewsFacetListFilter | undefined | 'invalid' {
  const fc = searchParams.get('feedCategory')?.trim()
  const fk = searchParams.get('feedKeyword')?.trim()
  const src = searchParams.get('feedSourceId')?.trim()
  const parts = [fc, fk, src].filter((s) => s !== undefined && s !== '')
  if (parts.length > 1) {
    return 'invalid'
  }
  if (fc !== undefined && fc !== '') {
    if (fc.length > MAX_FACET_LABEL_LEN) {
      return 'invalid'
    }
    return { kind: 'fc', value: fc }
  }
  if (fk !== undefined && fk !== '') {
    if (fk.length > MAX_FACET_LABEL_LEN) {
      return 'invalid'
    }
    return { kind: 'fk', value: fk }
  }
  if (src !== undefined && src !== '') {
    if (src.length > MAX_FEED_SOURCE_ID_LEN || !FEED_SOURCE_ID_RE.test(src)) {
      return 'invalid'
    }
    return { kind: 'src', sourceId: src }
  }
  return undefined
}

/**
 * Parse positive int in range; fall back to default when missing.
 * @param raw Query string or null
 * @param defaultValue Default when absent
 * @param max Upper bound inclusive
 * @returns Value or null if present but not a positive integer string
 */
function parseBoundedInt(raw: string | null, defaultValue: number, max: number): number | null {
  if (raw === null || raw === '') {
    return defaultValue
  }
  const trimmed = raw.trim()
  if (!POSITIVE_INT_RE.test(trimmed)) {
    return null
  }
  const n = Number.parseInt(trimmed, 10)
  if (!Number.isFinite(n) || n < 1) {
    return null
  }
  return Math.min(max, n)
}

/**
 * Parse non-negative integer for `offset` (0 allowed).
 * @param raw Query value or null
 * @returns Integer in [0, MAX_ITEM_OFFSET] or null if invalid
 */
function parseFeedOffset(raw: string | null): number | null {
  if (raw === null || raw === '') {
    return 0
  }
  const trimmed = raw.trim()
  if (!POSITIVE_INT_RE.test(trimmed)) {
    return null
  }
  const n = Number.parseInt(trimmed, 10)
  if (!Number.isFinite(n)) {
    return null
  }
  return Math.min(MAX_ITEM_OFFSET, n)
}

/**
 * Parse `retrySourceIds` (comma / semicolon / whitespace separated manifest ids). Only ids present in `sources` are kept.
 * @param raw Raw query value
 * @param sources Manifest slice for this request
 * @returns Unique ids in manifest order, capped at `sources.length`
 */
function parseRetrySourceIdsFromQuery(raw: string | undefined, sources: NewsSourceConfig[]): string[] {
  if (raw === undefined || raw.trim() === '') {
    return []
  }
  const allowed = new Set(sources.map((s) => s.id))
  const seen = new Set<string>()
  const out: string[] = []
  for (const part of raw.split(/[\s,;]+/)) {
    const id = part.trim()
    if (id === '' || seen.has(id) || !allowed.has(id) || !FEED_SOURCE_ID_RE.test(id)) {
      continue
    }
    seen.add(id)
    out.push(id)
    if (out.length >= sources.length) {
      break
    }
  }
  return out
}

/**
 * GET /api/news/feed — fetch RSS feeds, merge, dedupe, return latest items.
 */
export const GET = api(async (req) => {
  const handlerStartedAt = Date.now()
  const { searchParams } = new URL(req.url)
  const category = searchParams.get('category') ?? undefined
  const region = searchParams.get('region') ?? undefined

  if (category !== undefined && category !== '' && !isValidNewsCategory(category)) {
    return jsonInvalidParameters('invalid category', { headers: new Headers({ 'Content-Type': 'application/json' }) })
  }
  if (region !== undefined && region !== '' && !isValidNewsRegion(region)) {
    return jsonInvalidParameters('invalid region', { headers: new Headers({ 'Content-Type': 'application/json' }) })
  }

  const limitParam = searchParams.get('limit')
  const maxFeedsParam = searchParams.get('maxFeeds')
  const offsetParam = searchParams.get('offset')
  const feedAnchorRaw = searchParams.get('feedAnchor')?.trim()
  const limit = parseBoundedInt(limitParam, DEFAULT_ITEM_LIMIT, MAX_ITEM_LIMIT)
  const maxFeeds = parseBoundedInt(maxFeedsParam, DEFAULT_MAX_FEEDS, MAX_MAX_FEEDS)
  const offset = parseFeedOffset(offsetParam)

  if (limit === null) {
    return jsonInvalidParameters('invalid limit', { headers: new Headers({ 'Content-Type': 'application/json' }) })
  }
  if (maxFeeds === null) {
    return jsonInvalidParameters('invalid maxFeeds', { headers: new Headers({ 'Content-Type': 'application/json' }) })
  }
  if (offset === null) {
    return jsonInvalidParameters('invalid offset', { headers: new Headers({ 'Content-Type': 'application/json' }) })
  }

  if (feedAnchorRaw !== undefined && feedAnchorRaw !== '') {
    const t = Date.parse(feedAnchorRaw)
    if (Number.isNaN(t)) {
      return jsonInvalidParameters('invalid feedAnchor', { headers: new Headers({ 'Content-Type': 'application/json' }) })
    }
  }

  const facetParsed = parseFacetListFilterFromQuery(searchParams)
  if (facetParsed === 'invalid') {
    return jsonInvalidParameters('invalid facet filter (use at most one of feedCategory, feedKeyword, feedSourceId)', {
      headers: new Headers({ 'Content-Type': 'application/json' }),
    })
  }

  const listParam = searchParams.get('list')?.trim() ?? ''
  if (listParam !== '' && !isValidNewsListSlug(listParam)) {
    return jsonInvalidParameters('invalid list', { headers: new Headers({ 'Content-Type': 'application/json' }) })
  }

  let itemCategory: NewsCategory | undefined
  let listSubcategoryNorm = ''
  const useListQuery = listParam !== '' && isValidNewsListSlug(listParam)

  if (useListQuery) {
    const cat = getNewsCategoryForListSlug(listParam)
    if (cat) {
      itemCategory = cat
      listSubcategoryNorm = listParam
    }
  } else if (category !== undefined && category !== '' && isValidNewsCategory(category)) {
    itemCategory = category
    const subRaw = searchParams.get('sub')?.trim() ?? ''
    listSubcategoryNorm = normalizeNewsSubcategory(itemCategory, subRaw || undefined)
  }

  const baseUrl = getNewsFeedBaseUrl()
  const requestedRegion: '' | NewsRegion = region !== undefined && region !== '' && isValidNewsRegion(region) ? region : ''
  const categoryNorm = itemCategory ?? ''

  const session = await getAuthSession()
  const regionAccess = resolveNewsFeedRegionAccess(session.authenticated, requestedRegion)
  if (!regionAccess.ok) {
    return jsonForbidden(regionAccess.message, { headers: new Headers({ 'Content-Type': 'application/json' }) })
  }

  const windowAtMs = resolveNewsFeedWindowMs({ feedAnchorRaw, offset })
  const recentWindowHours = resolveNewsFeedPoolRecentWindowHours(listSubcategoryNorm)
  const poolCacheKey = await buildNewsFeedPoolCacheKey({
    baseUrl,
    category: categoryNorm,
    subcategory: listSubcategoryNorm,
    region: regionAccess.regionCacheKey,
    maxFeeds,
    recentWindowHours,
  })

  /**
   * When `list` or `category` is set, fetch that list’s sources, then `maxFeeds`;
   * otherwise first `maxFeeds` across all categories (no list dimension).
   */
  let sources = useListQuery
    ? filterNewsSources(undefined, regionAccess.regionFilter, undefined, listParam)
    : filterNewsSources(itemCategory, regionAccess.regionFilter, itemCategory !== undefined ? listSubcategoryNorm : undefined)
  sources = sources.slice(0, maxFeeds)

  const retrySourceIdsRaw = searchParams.get('retrySourceIds')?.trim() ?? ''
  const retrySourceIds = parseRetrySourceIdsFromQuery(retrySourceIdsRaw, sources)
  const partialRetryRequested = retrySourceIds.length > 0 && offset === 0

  const logCategory = listParam !== '' ? `list:${listParam}` : category !== undefined && category !== '' ? category : 'all'
  const logRegion = regionAccess.regionCacheKey === '' ? 'all' : regionAccess.regionCacheKey

  logNewsStructured(
    logger,
    'info',
    NEWS_FEED_API_FLOW,
    `News feed request: ${logCategory}/${logRegion} offset=${offset} limit=${limit} maxFeeds=${maxFeeds} (${sources.length} sources)`,
    'news_feed_request',
    {
      cat: logCategory,
      region: logRegion,
      offset,
      limit,
      maxFeeds,
      sourceIds: sources.map((s) => s.id),
      ...(partialRetryRequested ? { retrySourceIds } : {}),
    }
  )

  /**
   * HTTP timeline (default 10s total, see `NEWS_FEED_HANDLER_DEADLINE_MS`):
   * 1. Auth + param parsing (above) consumes wall clock.
   * 2. Pool phase must finish by `handlerDeadlineEpochMs - tailReserveMs` so prune/slice/JSON fit in the tail (`NEWS_FEED_HANDLER_TAIL_RESERVE_MS`).
   * 3. If the pool phase races past budget, serve L1/L2 only or an empty shell so the client still gets a response within the platform limit.
   */
  const handlerDeadlineEpochMs = getNewsFeedHttpHandlerDeadlineEpochMs(handlerStartedAt)
  const tailReserveMs = getNewsFeedHandlerTailReserveMs()
  const poolPhaseStartedAt = Date.now()
  const maxPoolWaitMs = Math.max(0, handlerDeadlineEpochMs - tailReserveMs - poolPhaseStartedAt)

  let poolPayload: NewsFeedPoolCachePayload
  let poolLayerHit: 'l1' | 'l2' | null
  let poolRefreshStatus: NewsFeedPoolRefreshStatus
  let handlerDeadlineStatus: NewsFeedHandlerDeadlineStatus
  let partialRetryApplied = false

  if (maxPoolWaitMs <= 0) {
    const fb = await tryReadNewsFeedPoolFromCacheOnly({ poolCacheKey, listSlug: listSubcategoryNorm })
    if (fb) {
      poolPayload = fb.payload
      poolLayerHit = fb.poolLayerHit
      poolRefreshStatus = 'none'
      handlerDeadlineStatus = 'cache_only'
    } else {
      poolPayload = createEmptyDeadlinePoolPayload(baseUrl, windowAtMs, sources, listSubcategoryNorm)
      poolLayerHit = null
      poolRefreshStatus = 'none'
      handlerDeadlineStatus = 'empty_timeout'
    }
  } else {
    type PoolPhaseOk = {
      payload: NewsFeedPoolCachePayload
      poolLayerHit: 'l1' | 'l2' | null
      poolRefreshStatus: NewsFeedPoolRefreshStatus
      partialRetry: boolean
    }
    const built = await Promise.race([
      (async (): Promise<PoolPhaseOk> => {
        if (partialRetryRequested) {
          const fb = await tryReadNewsFeedPoolFromCacheOnly({ poolCacheKey, listSlug: listSubcategoryNorm })
          if (fb !== null) {
            const payload = await applyRetrySourcesToNewsFeedPool({
              poolCacheKey,
              cachedPayload: fb.payload,
              allSources: sources,
              retrySourceIds,
              baseUrl,
              itemCategory,
              listSlug: listSubcategoryNorm,
              handlerDeadlineEpochMs,
            })
            return { payload, poolLayerHit: null, poolRefreshStatus: 'none', partialRetry: true }
          }
        }
        const r = await getOrBuildNewsFeedMergedPool({
          poolCacheKey,
          sources,
          baseUrl,
          windowAtMs,
          itemCategory,
          listSlug: listSubcategoryNorm,
          allowInlinePoolRefresh: offset === 0,
          handlerDeadlineEpochMs,
        })
        return { ...r, partialRetry: false }
      })(),
      new Promise<null>((resolve) => {
        setTimeout(() => resolve(null), maxPoolWaitMs)
      }),
    ])
    if (built === null) {
      const fb = await tryReadNewsFeedPoolFromCacheOnly({ poolCacheKey, listSlug: listSubcategoryNorm })
      if (fb) {
        poolPayload = fb.payload
        poolLayerHit = fb.poolLayerHit
        poolRefreshStatus = 'none'
        handlerDeadlineStatus = 'cache_only'
      } else {
        poolPayload = createEmptyDeadlinePoolPayload(baseUrl, windowAtMs, sources, listSubcategoryNorm)
        poolLayerHit = null
        poolRefreshStatus = 'none'
        handlerDeadlineStatus = 'empty_timeout'
      }
    } else {
      poolPayload = built.payload
      poolLayerHit = built.poolLayerHit
      poolRefreshStatus = built.poolRefreshStatus
      handlerDeadlineStatus = 'ok'
      partialRetryApplied = built.partialRetry
    }
  }

  const poolPhaseMs = Date.now() - poolPhaseStartedAt

  const poolSourceLabel = describeNewsFeedPoolSource(poolLayerHit)
  const poolResolvedSummary = `News feed pool: ${poolSourceLabel} — ${poolPhaseMs}ms, ${poolPayload.pool.length} rows (before window prune)`
  const poolResolvedDetail = {
    poolCacheLayer: poolLayerHit === 'l1' ? 'L1' : poolLayerHit === 'l2' ? 'L2' : null,
    /** True only for cold build this request, not inline reconcile refresh (`inline_ok` also has null layer hit). */
    poolCacheMiss: poolLayerHit === null && poolRefreshStatus === 'none',
    poolRefreshStatus,
    handlerDeadlineStatus,
    handlerBudgetMs: getNewsFeedHttpHandlerBudgetMs(),
    maxPoolWaitMs,
    poolPhaseMs,
    poolRowsBeforePrune: poolPayload.pool.length,
    lastMergedAtMs: poolPayload.lastMergedAtMs ?? null,
  }
  if (poolPayload.pool.length === 0) {
    logNewsStructured(logger, 'warn', NEWS_FEED_API_FLOW, poolResolvedSummary, 'news_feed_pool_resolved', poolResolvedDetail)
  } else {
    logNewsStructured(logger, 'ok', NEWS_FEED_API_FLOW, poolResolvedSummary, 'news_feed_pool_resolved', poolResolvedDetail)
  }
  if ((poolPayload.errors?.length ?? 0) > 0) {
    logNewsStructured(
      logger,
      'warn',
      NEWS_FEED_API_FLOW,
      `News feed pool: ${poolPayload.errors!.length} upstream source error(s) attached to pool`,
      'news_feed_pool_errors_summary',
      { failedSourceIds: [...new Set(poolPayload.errors!.map((e) => e.sourceId))] }
    )
    for (const e of poolPayload.errors!) {
      logNewsStructured(logger, 'warn', NEWS_FEED_API_FLOW, `News feed pool error: ${e.sourceId} — ${e.message}`, 'news_feed_pool_error', {
        sourceId: e.sourceId,
        message: e.message,
      })
    }
  }

  const prunedPayload = pruneNewsFeedPoolPayloadForWindow(poolPayload, windowAtMs)
  const responsePoolPayload = attachFinalizedTopicKeywordsToNewsPool(prunedPayload)

  if (prunedPayload.pool.length === 0 && poolPayload.pool.length > 0) {
    logNewsStructured(
      logger,
      'warn',
      NEWS_FEED_API_FLOW,
      `News feed pool: request window prune removed all rows (had ${poolPayload.pool.length} before anchor prune)`,
      'news_feed_pool_prune_empty',
      {
        poolRowsBeforePrune: poolPayload.pool.length,
        poolRowsAfterPrune: prunedPayload.pool.length,
        windowAtMs,
      }
    )
  }

  const {
    items,
    errors,
    fetchedAt,
    mergeStats,
    facets,
    baseUrl: responseBaseUrl,
    sourceInventory,
  } = sliceNewsFeedPageFromPool(responsePoolPayload, {
    facetListFilter: facetParsed,
    itemOffset: offset,
    itemLimit: limit,
  })

  const handlerDurationMs = Date.now() - handlerStartedAt
  const facetKind = facetParsed === undefined ? null : facetParsed.kind

  if (sourceInventory !== undefined && sourceInventory.length > 0) {
    for (const row of sourceInventory) {
      const invSummary = `News feed source tally: ${row.sourceId} — parsed=${row.parsedCount} pool=${row.poolCount}`
      const invDetail = {
        sourceId: row.sourceId,
        label: row.label,
        parsedCount: row.parsedCount,
        poolCount: row.poolCount,
      }
      if (row.poolCount === 0) {
        logNewsStructured(logger, 'warn', NEWS_FEED_API_FLOW, invSummary, 'news_feed_source_inventory', invDetail)
      } else {
        logNewsStructured(logger, 'ok', NEWS_FEED_API_FLOW, invSummary, 'news_feed_source_inventory', invDetail)
      }
    }
  }

  const responseSummary = `News feed response: ${items.length} items returned (${logCategory}/${logRegion} offset=${offset} limit=${limit}, hasMore=${mergeStats.hasMore}, handler ${handlerDurationMs}ms)`
  const responseDetail = {
    cat: logCategory,
    region: logRegion,
    offset,
    limit,
    facetKind,
    returnedItems: items.length,
    poolRowsAfterPrune: prunedPayload.pool.length,
    poolTotal: mergeStats.uniqueAfterDedupe,
    hasMore: mergeStats.hasMore,
    handlerDurationMs,
    poolCacheLayer: poolLayerHit === 'l1' ? 'L1' : poolLayerHit === 'l2' ? 'L2' : null,
  }
  if (items.length === 0 || mergeStats.uniqueAfterDedupe === 0) {
    logNewsStructured(logger, 'warn', NEWS_FEED_API_FLOW, responseSummary, 'news_feed_response', responseDetail)
  } else {
    logNewsStructured(logger, 'ok', NEWS_FEED_API_FLOW, responseSummary, 'news_feed_response', responseDetail)
  }

  const mergeStatsSummary = `News feed merge stats: raw=${mergeStats.rawItemCount} deduped=${mergeStats.uniqueAfterDedupe} sources=${mergeStats.sourcesWithItems}/${mergeStats.sourcesRequested} dupUrl=${mergeStats.duplicateDropped} dupTitle=${mergeStats.duplicateDroppedByTitle} droppedWindow=${mergeStats.droppedOutsideRecentWindow} missingLink=${mergeStats.droppedMissingLink}`
  const mergeStatsDetail = {
    rawItemCount: mergeStats.rawItemCount,
    uniqueAfterDedupe: mergeStats.uniqueAfterDedupe,
    sourcesWithItems: mergeStats.sourcesWithItems,
    sourcesRequested: mergeStats.sourcesRequested,
    sourcesEmptyOrFailed: mergeStats.sourcesEmptyOrFailed,
    duplicateDropped: mergeStats.duplicateDropped,
    duplicateDroppedByTitle: mergeStats.duplicateDroppedByTitle,
    droppedOutsideRecentWindow: mergeStats.droppedOutsideRecentWindow,
    droppedMissingLink: mergeStats.droppedMissingLink,
  }
  if (mergeStats.uniqueAfterDedupe === 0 || mergeStats.rawItemCount === 0) {
    logNewsStructured(logger, 'warn', NEWS_FEED_API_FLOW, mergeStatsSummary, 'news_feed_merge_stats', mergeStatsDetail)
  } else {
    logNewsStructured(logger, 'ok', NEWS_FEED_API_FLOW, mergeStatsSummary, 'news_feed_merge_stats', mergeStatsDetail)
  }

  const { warmup: warmupIssues, failures: failureIssues } = splitNewsFeedPoolErrors(errors)
  if (failureIssues.length > 0) {
    for (const e of failureIssues) {
      logNewsStructured(logger, 'warn', NEWS_FEED_API_FLOW, `News feed response error field: ${e.sourceId}`, 'news_feed_response_error', {
        sourceId: e.sourceId,
        message: e.message,
      })
    }
  }

  const responsePayload: {
    items: typeof items
    fetchedAt: string
    baseUrl: string
    mergeStats: typeof mergeStats
    facets: typeof facets
    sourceInventory?: typeof sourceInventory
    errors?: { sourceId: string; message: string }[]
    feedWarmup?: {
      pending: true
      sources: { sourceId: string; message: string }[]
      suggestedRetryAfterSeconds: number
      suggestedManualRetryAfterSeconds: number
    }
  } = { items, fetchedAt, baseUrl: responseBaseUrl, mergeStats, facets }

  if (sourceInventory !== undefined && sourceInventory.length > 0) {
    responsePayload.sourceInventory = sourceInventory
  }

  const suppressErrorsForStaleOnly = poolRefreshStatus === 'inline_failed_stale'
  if (!suppressErrorsForStaleOnly) {
    if (failureIssues.length > 0) {
      responsePayload.errors = failureIssues
    }
    if (warmupIssues.length > 0) {
      responsePayload.feedWarmup = {
        pending: true,
        sources: warmupIssues,
        suggestedRetryAfterSeconds: NEWS_FEED_WARMUP_POLL_INTERVAL_SECONDS,
        suggestedManualRetryAfterSeconds: NEWS_FEED_WARMUP_MANUAL_UNLOCK_SECONDS,
      }
    }
  }

  const headers = new Headers({
    'Content-Type': 'application/json',
    'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
  })
  if (poolLayerHit !== null) {
    headers.set(HEADER_CACHE_HIT, poolLayerHit === 'l1' ? 'L1' : 'L2')
  }
  if (newsFeedErrorsIncludeMergeBudgetSkip(poolPayload.errors)) {
    headers.set(HEADER_POOL_PARTIAL, '1')
  }
  if (poolRefreshStatus === 'inline_failed_stale') {
    headers.set(HEADER_POOL_STALE, '1')
  }
  if (poolRefreshStatus === 'inline_ok') {
    headers.set(HEADER_POOL_REFRESH_INLINE, 'inline')
  }
  if (handlerDeadlineStatus !== 'ok') {
    headers.set(HEADER_FEED_DEADLINE_STATUS, handlerDeadlineStatus)
  }
  if (partialRetryApplied) {
    headers.set(HEADER_PARTIAL_RETRY, '1')
  }

  return jsonSuccess(responsePayload, { headers })
})
