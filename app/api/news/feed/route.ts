import { api } from '@/initializer/controller'
import { jsonInvalidParameters, jsonSuccess } from '@/initializer/response'
import { createLogger } from '@/services/logger'
import { pruneNewsFeedPoolPayloadForWindow, sliceNewsFeedPageFromPool } from '@/services/news/aggregate-feed'
import type { NewsFacetListFilter } from '@/services/news/facet-list-filter'
import { buildNewsFeedPoolCacheKey, getOrBuildNewsFeedMergedPool, resolveNewsFeedPoolRecentWindowHours, resolveNewsFeedWindowMs } from '@/services/news/feed-kv-cache'
import { getNewsCategoryForListSlug, isValidNewsListSlug, normalizeNewsSubcategory } from '@/services/news/news-subcategories'
import { filterNewsSources, getNewsFeedBaseUrl, isValidNewsCategory, isValidNewsRegion } from '@/services/news/sources'
import type { NewsCategory } from '@/services/news/types'

/** Node runtime: merged pool is built or read from cache synchronously before the JSON response (no post-response RSS jobs). */
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
  const regionNorm = region !== undefined && region !== '' && isValidNewsRegion(region) ? region : ''
  const categoryNorm = itemCategory ?? ''

  const windowAtMs = resolveNewsFeedWindowMs({ feedAnchorRaw, offset })
  const recentWindowHours = resolveNewsFeedPoolRecentWindowHours(listSubcategoryNorm)
  const poolCacheKey = await buildNewsFeedPoolCacheKey({
    baseUrl,
    category: categoryNorm,
    subcategory: listSubcategoryNorm,
    region: regionNorm,
    maxFeeds,
    recentWindowHours,
  })

  /**
   * When `list` or `category` is set, fetch that list’s sources, then `maxFeeds`;
   * otherwise first `maxFeeds` across all categories (no list dimension).
   */
  let sources = useListQuery
    ? filterNewsSources(undefined, region || undefined, undefined, listParam)
    : filterNewsSources(itemCategory, region || undefined, itemCategory !== undefined ? listSubcategoryNorm : undefined)
  sources = sources.slice(0, maxFeeds)

  const logCategory = listParam !== '' ? `list:${listParam}` : category !== undefined && category !== '' ? category : 'all'
  const logRegion = region !== undefined && region !== '' ? region : 'all'

  logger.info(
    `News feed request: ${logCategory}/${logRegion} offset=${offset} limit=${limit} maxFeeds=${maxFeeds} (${sources.length} sources)`,
    JSON.stringify({
      flow: 'GET /api/news/feed',
      step: 'request_accepted',
      event: 'news_feed_request',
      cat: logCategory,
      region: logRegion,
      offset,
      limit,
      maxFeeds,
      sourceIds: sources.map((s) => s.id),
    })
  )

  const poolPhaseStartedAt = Date.now()
  const { payload: poolPayload, poolLayerHit } = await getOrBuildNewsFeedMergedPool({
    poolCacheKey,
    sources,
    baseUrl,
    windowAtMs,
    itemCategory,
    listSlug: listSubcategoryNorm,
  })
  const poolPhaseMs = Date.now() - poolPhaseStartedAt

  const poolSourceLabel = describeNewsFeedPoolSource(poolLayerHit)
  const poolResolvedMeta = JSON.stringify({
    flow: 'GET /api/news/feed',
    step: 'pool_resolved',
    event: 'news_feed_pool_resolved',
    poolCacheLayer: poolLayerHit === 'l1' ? 'L1' : poolLayerHit === 'l2' ? 'L2' : null,
    poolCacheMiss: poolLayerHit === null,
    poolPhaseMs,
    poolRowsBeforePrune: poolPayload.pool.length,
    lastMergedAtMs: poolPayload.lastMergedAtMs ?? null,
  })
  const poolResolvedSummary = `News feed pool: ${poolSourceLabel} — ${poolPhaseMs}ms, ${poolPayload.pool.length} rows (before window prune)`
  if (poolPayload.pool.length === 0) {
    logger.warn(poolResolvedSummary, poolResolvedMeta)
  } else {
    logger.info(poolResolvedSummary, poolResolvedMeta)
  }
  if ((poolPayload.errors?.length ?? 0) > 0) {
    logger.info(
      `News feed pool: ${poolPayload.errors!.length} upstream source error(s) attached to pool`,
      JSON.stringify({
        flow: 'GET /api/news/feed',
        step: 'pool_partial_errors',
        event: 'news_feed_pool_errors_summary',
        failedSourceIds: [...new Set(poolPayload.errors!.map((e) => e.sourceId))],
      })
    )
    for (const e of poolPayload.errors!) {
      logger.info(
        `News feed pool error: ${e.sourceId} — ${e.message}`,
        JSON.stringify({
          flow: 'GET /api/news/feed',
          step: 'pool_error_detail',
          event: 'news_feed_pool_error',
          sourceId: e.sourceId,
          message: e.message,
        })
      )
    }
  }

  const prunedPayload = pruneNewsFeedPoolPayloadForWindow(poolPayload, windowAtMs)

  if (prunedPayload.pool.length === 0 && poolPayload.pool.length > 0) {
    logger.warn(
      `News feed pool: request window prune removed all rows (had ${poolPayload.pool.length} before anchor prune)`,
      JSON.stringify({
        flow: 'GET /api/news/feed',
        step: 'pool_prune_empty',
        event: 'news_feed_pool_prune_empty',
        poolRowsBeforePrune: poolPayload.pool.length,
        poolRowsAfterPrune: prunedPayload.pool.length,
        windowAtMs,
      })
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
  } = sliceNewsFeedPageFromPool(prunedPayload, {
    facetListFilter: facetParsed,
    itemOffset: offset,
    itemLimit: limit,
  })

  const handlerDurationMs = Date.now() - handlerStartedAt
  const facetKind = facetParsed === undefined ? null : facetParsed.kind

  if (sourceInventory !== undefined && sourceInventory.length > 0) {
    for (const row of sourceInventory) {
      const invMeta = JSON.stringify({
        flow: 'GET /api/news/feed',
        step: 'source_inventory',
        event: 'news_feed_source_inventory',
        sourceId: row.sourceId,
        label: row.label,
        parsedCount: row.parsedCount,
        poolCount: row.poolCount,
      })
      const invSummary = `News feed source tally: ${row.sourceId} — parsed=${row.parsedCount} pool=${row.poolCount}`
      if (row.poolCount === 0) {
        logger.warn(invSummary, invMeta)
      } else {
        logger.info(invSummary, invMeta)
      }
    }
  }

  const responseMeta = JSON.stringify({
    flow: 'GET /api/news/feed',
    step: 'response_page',
    event: 'news_feed_response',
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
  })
  const responseSummary = `News feed response: ${items.length} items returned (${logCategory}/${logRegion} offset=${offset} limit=${limit}, hasMore=${mergeStats.hasMore}, handler ${handlerDurationMs}ms)`
  if (items.length === 0 || mergeStats.uniqueAfterDedupe === 0) {
    logger.warn(responseSummary, responseMeta)
  } else {
    logger.info(responseSummary, responseMeta)
  }

  const mergeStatsMeta = JSON.stringify({
    flow: 'GET /api/news/feed',
    step: 'merge_stats',
    event: 'news_feed_merge_stats',
    rawItemCount: mergeStats.rawItemCount,
    uniqueAfterDedupe: mergeStats.uniqueAfterDedupe,
    sourcesWithItems: mergeStats.sourcesWithItems,
    sourcesRequested: mergeStats.sourcesRequested,
    sourcesEmptyOrFailed: mergeStats.sourcesEmptyOrFailed,
    duplicateDropped: mergeStats.duplicateDropped,
    duplicateDroppedByTitle: mergeStats.duplicateDroppedByTitle,
    droppedOutsideRecentWindow: mergeStats.droppedOutsideRecentWindow,
    droppedMissingLink: mergeStats.droppedMissingLink,
  })
  const mergeStatsSummary = `News feed merge stats: raw=${mergeStats.rawItemCount} deduped=${mergeStats.uniqueAfterDedupe} sources=${mergeStats.sourcesWithItems}/${mergeStats.sourcesRequested} dupUrl=${mergeStats.duplicateDropped} dupTitle=${mergeStats.duplicateDroppedByTitle} droppedWindow=${mergeStats.droppedOutsideRecentWindow} missingLink=${mergeStats.droppedMissingLink}`
  if (mergeStats.uniqueAfterDedupe === 0 || mergeStats.rawItemCount === 0) {
    logger.warn(mergeStatsSummary, mergeStatsMeta)
  } else {
    logger.info(mergeStatsSummary, mergeStatsMeta)
  }

  if (errors.length > 0) {
    for (const e of errors) {
      logger.info(
        `News feed response error field: ${e.sourceId}`,
        JSON.stringify({
          flow: 'GET /api/news/feed',
          step: 'response_error',
          event: 'news_feed_response_error',
          sourceId: e.sourceId,
          message: e.message,
        })
      )
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
  } = { items, fetchedAt, baseUrl: responseBaseUrl, mergeStats, facets }

  if (sourceInventory !== undefined && sourceInventory.length > 0) {
    responsePayload.sourceInventory = sourceInventory
  }

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
