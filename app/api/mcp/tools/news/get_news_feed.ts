import { z } from 'zod'

import { tool } from '@/initializer/mcp'
import { getAuthSession } from '@/services/auth/session'
import { getNewsCategoryForListSlug, isValidNewsListSlug, normalizeNewsSubcategory } from '@/services/news/config/news-subcategories'
import type { NewsFacetListFilter } from '@/services/news/facets/facet-list-filter'
import { attachFinalizedTopicKeywordsToNewsPool, pruneNewsFeedPoolPayloadForWindow, sliceNewsFeedPageFromPool } from '@/services/news/feed/aggregate-feed'
import {
  applyRetrySourcesToNewsFeedPool,
  buildNewsFeedPoolCacheKey,
  createEmptyDeadlinePoolPayload,
  getNewsFeedHandlerTailReserveMs,
  getNewsFeedHttpHandlerDeadlineEpochMs,
  getOrBuildNewsFeedMergedPool,
  type NewsFeedHandlerDeadlineStatus,
  resolveNewsFeedPoolRecentWindowHours,
  resolveNewsFeedWindowMs,
  tryReadNewsFeedPoolFromCacheOnly,
} from '@/services/news/feed/feed-kv-cache'
import { NEWS_FEED_WARMUP_MANUAL_UNLOCK_SECONDS, NEWS_FEED_WARMUP_POLL_INTERVAL_SECONDS, splitNewsFeedPoolErrors } from '@/services/news/feed/news-feed-source-issue'
import { resolveNewsFeedRegionAccess } from '@/services/news/region/news-feed-region-access'
import { filterNewsSources, getNewsFeedBaseUrl } from '@/services/news/sources/sources'
import type { NewsRegion } from '@/services/news/types'

const DEFAULT_ITEM_LIMIT = 30
const MAX_ITEM_LIMIT = 100
const DEFAULT_MAX_FEEDS = 15
const MAX_MAX_FEEDS = 25
const MAX_ITEM_OFFSET = 2000
const MAX_FACET_LABEL_LEN = 200
const MAX_FEED_SOURCE_ID_LEN = 80
const FEED_SOURCE_ID_RE = /^[\w-]+$/

/**
 * MCP tool: aggregate latest items from multiple RSS feeds.
 */
export const get_news_feed = tool(
  'get_news_feed',
  'Aggregate latest news from RSS (RSSHub-compatible). Prefer `list` (flat slug, e.g. headlines, media) to match the overview UI; or use legacy `category` + optional `sub`. When neither is set, first maxFeeds across all categories. Optional region (`cn` | `hk_tw` | `intl`): `hk_tw` and `intl` require a signed-in session; unsigned callers only receive mainland (`cn`) sources. At most one of feedCategory, feedKeyword, feedSourceId before pagination. Cached L1/L2. For offset>0 pass feedAnchor from first page fetchedAt. Optional `retrySourceIds` (first page only): re-fetch only those manifest ids into the pool when L1/L2 exists (same as HTTP `retrySourceIds`). Returns items, fetchedAt, baseUrl, mergeStats, facets, optional sourceInventory; `errors` lists hard upstream failures only; `feedWarmup` lists transient/timeouts for polling.',
  z.object({
    list: z.string().min(1).max(48).optional().describe('Flat list slug (same as /news/[slug] and ?list= on the HTTP API); when set, category/sub are ignored'),
    category: z.enum(['general-news', 'tech-internet', 'game-entertainment', 'science-academic']).optional().describe('Legacy manifest tab when `list` is omitted'),
    sub: z.string().min(1).max(48).optional().describe('Legacy sub-tab when category is set; invalid/missing → default sub for that category'),
    region: z.enum(['cn', 'hk_tw', 'intl']).optional().describe('Filter sources by region'),
    limit: z.number().int().min(1).max(MAX_ITEM_LIMIT).optional().describe(`Max items after merge (default ${DEFAULT_ITEM_LIMIT})`),
    maxFeeds: z.number().int().min(1).max(MAX_MAX_FEEDS).optional().describe(`Max RSS feeds to fetch (default ${DEFAULT_MAX_FEEDS})`),
    offset: z.number().int().min(0).max(MAX_ITEM_OFFSET).optional().describe('Skip this many items after merge/today filter (pagination; default 0)'),
    feedAnchor: z.string().optional().describe('ISO timestamp from first-page fetchedAt; required for correct pagination when offset > 0'),
    feedCategory: z
      .string()
      .min(1)
      .max(MAX_FACET_LABEL_LEN)
      .optional()
      .describe('RSS-derived category label; filter list before pagination (exclusive with feedKeyword / feedSourceId)'),
    feedKeyword: z.string().min(1).max(MAX_FACET_LABEL_LEN).optional().describe('RSS-derived keyword; filter list before pagination (exclusive with feedCategory / feedSourceId)'),
    feedSourceId: z
      .string()
      .min(1)
      .max(MAX_FEED_SOURCE_ID_LEN)
      .regex(FEED_SOURCE_ID_RE)
      .optional()
      .describe('Manifest source id; filter list before pagination (exclusive with feedCategory / feedKeyword)'),
    retrySourceIds: z
      .array(z.string().min(1).max(MAX_FEED_SOURCE_ID_LEN).regex(FEED_SOURCE_ID_RE))
      .max(MAX_MAX_FEEDS)
      .optional()
      .describe(
        'When offset=0 and L1/L2 has a pool, re-fetch RSS for these manifest ids only and merge into the cache; unknown ids are ignored. If cache is empty, runs a full merge instead.'
      ),
  }),
  async (params) => {
    const handlerStartedAt = Date.now()
    const { category } = params
    const listTrimmed = params.list?.trim() ?? ''
    const session = await getAuthSession()
    const requestedRegion: '' | NewsRegion = params.region ?? ''
    const regionAccess = resolveNewsFeedRegionAccess(session.authenticated, requestedRegion)
    if (!regionAccess.ok) {
      throw new Error(regionAccess.message)
    }
    if (listTrimmed !== '' && !isValidNewsListSlug(listTrimmed)) {
      throw new Error('invalid list: use a known flat slug (e.g. headlines, media, games)')
    }
    const limit = params.limit ?? DEFAULT_ITEM_LIMIT
    const maxFeeds = params.maxFeeds ?? DEFAULT_MAX_FEEDS
    const offset = params.offset ?? 0
    const anchorTrimmed = params.feedAnchor?.trim()
    if (anchorTrimmed !== undefined && anchorTrimmed !== '') {
      const t = Date.parse(anchorTrimmed)
      if (Number.isNaN(t)) {
        throw new Error('invalid feedAnchor: use ISO 8601 timestamp from the first page fetchedAt')
      }
    }

    const { feedCategory, feedKeyword, feedSourceId } = params
    const facetParts = [feedCategory, feedKeyword, feedSourceId].filter((x) => x !== undefined && x !== '')
    if (facetParts.length > 1) {
      throw new Error('use at most one of feedCategory, feedKeyword, feedSourceId')
    }
    let facetListFilter: NewsFacetListFilter | undefined
    if (feedCategory !== undefined && feedCategory !== '') {
      facetListFilter = { kind: 'fc', value: feedCategory }
    } else if (feedKeyword !== undefined && feedKeyword !== '') {
      facetListFilter = { kind: 'fk', value: feedKeyword }
    } else if (feedSourceId !== undefined && feedSourceId !== '') {
      facetListFilter = { kind: 'src', sourceId: feedSourceId }
    }

    const useList = listTrimmed !== '' && isValidNewsListSlug(listTrimmed)
    const itemCategory = category
    const baseUrl = getNewsFeedBaseUrl()
    const listSubNorm = useList ? listTrimmed : itemCategory !== undefined ? normalizeNewsSubcategory(itemCategory, params.sub) : ''
    let sources = useList
      ? filterNewsSources(undefined, regionAccess.regionFilter, undefined, listTrimmed)
      : filterNewsSources(itemCategory, regionAccess.regionFilter, itemCategory !== undefined ? listSubNorm : undefined)
    sources = sources.slice(0, maxFeeds)
    const regionNorm = regionAccess.regionCacheKey
    const resolvedCategory = useList ? getNewsCategoryForListSlug(listTrimmed) : itemCategory
    const categoryNorm = resolvedCategory ?? ''

    const windowAtMs = resolveNewsFeedWindowMs({ feedAnchorRaw: params.feedAnchor, offset })
    const recentWindowHours = resolveNewsFeedPoolRecentWindowHours(listSubNorm)
    const poolCacheKey = await buildNewsFeedPoolCacheKey({
      baseUrl,
      category: categoryNorm,
      subcategory: listSubNorm,
      region: regionNorm,
      maxFeeds,
      recentWindowHours,
    })

    const retrySourceIds = params.retrySourceIds === undefined ? [] : [...new Set(params.retrySourceIds.filter((id) => sources.some((s) => s.id === id)))]

    const handlerDeadlineEpochMs = getNewsFeedHttpHandlerDeadlineEpochMs(handlerStartedAt)
    const tailReserveMs = getNewsFeedHandlerTailReserveMs()
    const poolPhaseStartedAt = Date.now()
    const maxPoolWaitMs = Math.max(0, handlerDeadlineEpochMs - tailReserveMs - poolPhaseStartedAt)

    let poolPayload: Awaited<ReturnType<typeof getOrBuildNewsFeedMergedPool>>['payload']
    let handlerDeadlineStatus: NewsFeedHandlerDeadlineStatus

    const buildPoolPayload = async () => {
      if (retrySourceIds.length > 0 && offset === 0) {
        const fb = await tryReadNewsFeedPoolFromCacheOnly({ poolCacheKey, listSlug: listSubNorm })
        if (fb !== null) {
          return applyRetrySourcesToNewsFeedPool({
            poolCacheKey,
            cachedPayload: fb.payload,
            allSources: sources,
            retrySourceIds,
            baseUrl,
            itemCategory: resolvedCategory,
            listSlug: listSubNorm,
            handlerDeadlineEpochMs,
          })
        }
      }
      return (
        await getOrBuildNewsFeedMergedPool({
          poolCacheKey,
          sources,
          baseUrl,
          windowAtMs,
          itemCategory: resolvedCategory,
          listSlug: listSubNorm,
          allowInlinePoolRefresh: offset === 0,
          handlerDeadlineEpochMs,
        })
      ).payload
    }

    if (maxPoolWaitMs <= 0) {
      const fb = await tryReadNewsFeedPoolFromCacheOnly({ poolCacheKey, listSlug: listSubNorm })
      if (fb !== null) {
        poolPayload = fb.payload
        handlerDeadlineStatus = 'cache_only'
      } else {
        poolPayload = createEmptyDeadlinePoolPayload(baseUrl, windowAtMs, sources, listSubNorm)
        handlerDeadlineStatus = 'empty_timeout'
      }
    } else {
      const built = await Promise.race([
        buildPoolPayload(),
        new Promise<null>((resolve) => {
          setTimeout(() => resolve(null), maxPoolWaitMs)
        }),
      ])
      if (built === null) {
        const fb = await tryReadNewsFeedPoolFromCacheOnly({ poolCacheKey, listSlug: listSubNorm })
        if (fb !== null) {
          poolPayload = fb.payload
          handlerDeadlineStatus = 'cache_only'
        } else {
          poolPayload = createEmptyDeadlinePoolPayload(baseUrl, windowAtMs, sources, listSubNorm)
          handlerDeadlineStatus = 'empty_timeout'
        }
      } else {
        poolPayload = built
        handlerDeadlineStatus = 'ok'
      }
    }

    const prunedPayload = pruneNewsFeedPoolPayloadForWindow(poolPayload, windowAtMs)
    const responsePoolPayload = attachFinalizedTopicKeywordsToNewsPool(prunedPayload)

    const {
      items,
      errors,
      fetchedAt,
      mergeStats,
      facets,
      baseUrl: responseBaseUrl,
      sourceInventory,
    } = sliceNewsFeedPageFromPool(responsePoolPayload, { facetListFilter, itemOffset: offset, itemLimit: limit })

    const { warmup: warmupIssues, failures: failureIssues } = splitNewsFeedPoolErrors(errors)

    const out: {
      items: typeof items
      fetchedAt: string
      baseUrl: string
      mergeStats: typeof mergeStats
      facets: typeof facets
      sourceInventory?: typeof sourceInventory
      errors?: { sourceId: string; message: string }[]
      handlerDeadlineStatus: NewsFeedHandlerDeadlineStatus
      feedWarmup?: {
        pending: true
        sources: { sourceId: string; message: string }[]
        suggestedRetryAfterSeconds: number
        suggestedManualRetryAfterSeconds: number
      }
    } = { items, fetchedAt, baseUrl: responseBaseUrl, mergeStats, facets, handlerDeadlineStatus }
    if (sourceInventory !== undefined && sourceInventory.length > 0) {
      out.sourceInventory = sourceInventory
    }
    if (failureIssues.length > 0) {
      out.errors = failureIssues
    }
    if (warmupIssues.length > 0) {
      out.feedWarmup = {
        pending: true,
        sources: warmupIssues,
        suggestedRetryAfterSeconds: NEWS_FEED_WARMUP_POLL_INTERVAL_SECONDS,
        suggestedManualRetryAfterSeconds: NEWS_FEED_WARMUP_MANUAL_UNLOCK_SECONDS,
      }
    }
    return out
  }
)
