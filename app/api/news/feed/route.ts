import { api } from '@/initializer/controller'
import { jsonInvalidParameters, jsonSuccess } from '@/initializer/response'
import { createLogger } from '@/services/logger'
import { pruneNewsFeedPoolPayloadForWindow, sliceNewsFeedPageFromPool } from '@/services/news/aggregate-feed'
import type { NewsFacetListFilter } from '@/services/news/facet-list-filter'
import {
  buildNewsFeedPoolCacheKey,
  getOrBuildNewsFeedMergedPool,
  isNewsFeedPoolBackgroundRefreshDue,
  resolveNewsFeedWindowMs,
  scheduleNewsFeedFailedSourcesRetryIfNeeded,
  scheduleNewsFeedPoolBackgroundRefreshIfStale,
} from '@/services/news/feed-kv-cache'
import { filterNewsSources, getNewsFeedBaseUrl, isValidNewsCategory, isValidNewsRegion } from '@/services/news/sources'

/** Node runtime: `after()` schedules RSS pool reconcile without blocking the JSON response. */
export const runtime = 'nodejs'

const logger = createLogger('api-news-feed')

/** Same as geo API: `X-Cache-Hit` = `L1` (memory) or `L2` (KV). Omitted when the merged pool was built fresh (miss). */
const HEADER_CACHE_HIT = 'X-Cache-Hit'

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

  const itemCategory = category !== undefined && category !== '' && isValidNewsCategory(category) ? category : undefined

  const baseUrl = getNewsFeedBaseUrl()
  const regionNorm = region !== undefined && region !== '' && isValidNewsRegion(region) ? region : ''
  const categoryNorm = itemCategory ?? ''

  const windowAtMs = resolveNewsFeedWindowMs({ feedAnchorRaw, offset })
  const poolCacheKey = await buildNewsFeedPoolCacheKey({
    baseUrl,
    category: categoryNorm,
    region: regionNorm,
    maxFeeds,
  })

  let sources = filterNewsSources(undefined, region || undefined)
  sources = sources.slice(0, maxFeeds)

  const poolPhaseStartedAt = Date.now()
  const { payload: poolPayload, poolLayerHit } = await getOrBuildNewsFeedMergedPool({
    poolCacheKey,
    sources,
    baseUrl,
    windowAtMs,
    itemCategory,
  })
  const poolPhaseMs = Date.now() - poolPhaseStartedAt

  const backgroundRefreshDue = isNewsFeedPoolBackgroundRefreshDue(poolLayerHit, poolPayload)

  scheduleNewsFeedPoolBackgroundRefreshIfStale({
    poolLayerHit,
    payload: poolPayload,
    poolCacheKey,
    sources,
    baseUrl,
    itemCategory,
  })

  if ((poolPayload.errors?.length ?? 0) > 0) {
    scheduleNewsFeedFailedSourcesRetryIfNeeded({
      poolCacheKey,
      sources,
      baseUrl,
      itemCategory,
    })
  }

  const poolSourceLabel = describeNewsFeedPoolSource(poolLayerHit)
  const poolResolvedSummary = `News feed: merged pool ready (${poolSourceLabel}, ${poolPhaseMs}ms)${
    backgroundRefreshDue ? '; background RSS refresh scheduled after response' : ''
  }.`
  logger.info(
    poolResolvedSummary,
    JSON.stringify({
      flow: 'GET /api/news/feed',
      step: 'merged_pool_ready',
      message: poolResolvedSummary,
      event: 'news_feed_pool_resolved',
      poolCacheHit: poolLayerHit !== null,
      poolCacheLayer: poolLayerHit === 'l1' ? 'L1' : poolLayerHit === 'l2' ? 'L2' : null,
      poolMiss: poolLayerHit === null,
      poolPhaseMs,
      lastMergedAtMs: poolPayload.lastMergedAtMs ?? null,
      backgroundRefreshScheduled: backgroundRefreshDue,
      failedSourceRetryScheduled: (poolPayload.errors?.length ?? 0) > 0,
      failedSourceIds: poolPayload.errors !== undefined && poolPayload.errors.length > 0 ? [...new Set(poolPayload.errors.map((e) => e.sourceId))] : [],
      poolRowsBeforePrune: poolPayload.pool.length,
    })
  )

  const prunedPayload = pruneNewsFeedPoolPayloadForWindow(poolPayload, windowAtMs)

  const {
    items,
    errors,
    fetchedAt,
    mergeStats,
    facets,
    baseUrl: responseBaseUrl,
  } = sliceNewsFeedPageFromPool(prunedPayload, {
    facetListFilter: facetParsed,
    itemOffset: offset,
    itemLimit: limit,
  })

  const logCategory = (() => {
    const c = searchParams.get('category')
    return c !== null && c !== '' ? c : 'all'
  })()
  const logRegion = (() => {
    const r = searchParams.get('region')
    return r !== null && r !== '' ? r : 'all'
  })()
  const handlerDurationMs = Date.now() - handlerStartedAt
  const facetHint = facetParsed === undefined ? 'no facet filter on this page' : `facet kind ${facetParsed.kind} (list filtered before pagination)`
  const responseSummary = `News feed: returning page — ${logCategory}/${logRegion}, offset=${offset}, limit=${limit}, ${items.length} items (pool ${mergeStats.uniqueAfterDedupe} deduped), hasMore=${mergeStats.hasMore}, ${handlerDurationMs}ms.`
  const logLine: Record<string, unknown> = {
    flow: 'GET /api/news/feed',
    step: 'json_response',
    message: `${responseSummary} ${facetHint}`,
    event: 'news_feed_complete',
    handlerDurationMs,
    poolCacheHit: poolLayerHit !== null,
    poolCacheLayer: poolLayerHit === 'l1' ? 'L1' : poolLayerHit === 'l2' ? 'L2' : null,
    poolRowsAfterPrune: prunedPayload.pool.length,
    cat: logCategory,
    region: logRegion,
    offset,
    limit,
    facetKind: facetParsed === undefined ? null : facetParsed.kind,
    sources: `${mergeStats.sourcesWithItems}/${mergeStats.sourcesRequested}`,
    raw: mergeStats.rawItemCount,
    deduped: mergeStats.uniqueAfterDedupe,
    returned: items.length,
    hasMore: mergeStats.hasMore,
  }
  if (mergeStats.sourcesEmptyOrFailed > 0) {
    logLine.failed = mergeStats.sourcesEmptyOrFailed
  }
  if (errors.length > 0) {
    logLine.errors = errors.map((e) => e.sourceId)
  }
  logger.info(responseSummary, JSON.stringify(logLine))

  const responsePayload: {
    items: typeof items
    fetchedAt: string
    baseUrl: string
    mergeStats: typeof mergeStats
    facets: typeof facets
    errors?: { sourceId: string; message: string }[]
  } = { items, fetchedAt, baseUrl: responseBaseUrl, mergeStats, facets }

  if (errors.length > 0) {
    responsePayload.errors = errors
  }

  const headers = new Headers({
    'Content-Type': 'application/json',
    'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
  })
  if (poolLayerHit !== null) {
    headers.set(HEADER_CACHE_HIT, poolLayerHit === 'l1' ? 'L1' : 'L2')
  }

  return jsonSuccess(responsePayload, { headers })
})
