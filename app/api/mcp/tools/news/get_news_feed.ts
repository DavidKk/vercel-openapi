import { z } from 'zod'

import { tool } from '@/initializer/mcp'
import { pruneNewsFeedPoolPayloadForWindow, sliceNewsFeedPageFromPool } from '@/services/news/aggregate-feed'
import type { NewsFacetListFilter } from '@/services/news/facet-list-filter'
import { buildNewsFeedPoolCacheKey, getOrBuildNewsFeedMergedPool, resolveNewsFeedWindowMs } from '@/services/news/feed-kv-cache'
import { filterNewsSources, getNewsFeedBaseUrl } from '@/services/news/sources'

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
  'Aggregate latest news from RSS feeds (RSSHub-compatible). All matching sources are merged first; optional category filters returned rows by article taxonomy (manifest category), not which RSS feeds are fetched. Optional region limits sources by region. At most one of feedCategory, feedKeyword, feedSourceId filters the merged pool before pagination (same as HTTP query). Merged pool is cached (L1/L2); facet changes reuse the pool. For offset>0, pass feedAnchor equal to fetchedAt from the first page. Returns { items, fetchedAt, baseUrl, mergeStats, facets, errors? }.',
  z.object({
    category: z
      .enum(['general-news', 'tech-internet', 'social-platform', 'game-entertainment', 'science-academic'])
      .optional()
      .describe('Filter merged items by manifest article category'),
    region: z.enum(['cn', 'hk_tw']).optional().describe('Filter sources by region'),
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
  }),
  async (params) => {
    const { category, region } = params
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

    let sources = filterNewsSources(undefined, region)
    sources = sources.slice(0, maxFeeds)
    const baseUrl = getNewsFeedBaseUrl()
    const itemCategory = category
    const regionNorm = region ?? ''
    const categoryNorm = itemCategory ?? ''

    const windowAtMs = resolveNewsFeedWindowMs({ feedAnchorRaw: params.feedAnchor, offset })
    const poolCacheKey = await buildNewsFeedPoolCacheKey({
      baseUrl,
      category: categoryNorm,
      region: regionNorm,
      maxFeeds,
    })

    const { payload: poolPayload } = await getOrBuildNewsFeedMergedPool({
      poolCacheKey,
      sources,
      baseUrl,
      windowAtMs,
      itemCategory,
    })

    const prunedPayload = pruneNewsFeedPoolPayloadForWindow(poolPayload, windowAtMs)

    const {
      items,
      errors,
      fetchedAt,
      mergeStats,
      facets,
      baseUrl: responseBaseUrl,
    } = sliceNewsFeedPageFromPool(prunedPayload, { facetListFilter, itemOffset: offset, itemLimit: limit })

    const out: {
      items: typeof items
      fetchedAt: string
      baseUrl: string
      mergeStats: typeof mergeStats
      facets: typeof facets
      errors?: { sourceId: string; message: string }[]
    } = { items, fetchedAt, baseUrl: responseBaseUrl, mergeStats, facets }
    if (errors.length > 0) {
      out.errors = errors
    }
    return out
  }
)
