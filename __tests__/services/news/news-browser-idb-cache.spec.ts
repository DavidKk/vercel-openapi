import {
  applyFacetFilterToCachedOverviewItems,
  buildNewsFeedOverviewFacetIdbKey,
  buildNewsFeedOverviewIdbKey,
  cachedOverviewHasMoreHint,
  getNewsFeedOverviewCachedWarmupSources,
  isNewsFeedOverviewCachePayload,
  NEWS_FEED_OVERVIEW_IDB_TTL_MS,
  shouldBypassFreshNewsFeedOverviewCache,
} from '@/services/news/browser/idb-cache'
import type { AggregatedNewsItem } from '@/services/news/types'

describe('news browser idb-cache', () => {
  it('should build one L0 key per list slug (facets are client-filtered)', () => {
    expect(buildNewsFeedOverviewIdbKey('headlines')).toBe('v1:overview:headlines')
    expect(buildNewsFeedOverviewIdbKey('games')).toBe('v1:overview:games')
  })

  it('should build facet-scoped overview keys for keyword tag and source', () => {
    expect(buildNewsFeedOverviewFacetIdbKey('headlines', { kind: 'fk', value: '伊朗' })).toBe(`v1:overview:headlines:fk:${encodeURIComponent('伊朗')}`)
    expect(buildNewsFeedOverviewFacetIdbKey('headlines', { kind: 'fc', value: '国内' })).toBe(`v1:overview:headlines:fc:${encodeURIComponent('国内')}`)
    expect(buildNewsFeedOverviewFacetIdbKey('headlines', { kind: 'src', sourceId: 'x-y' })).toBe('v1:overview:headlines:src:x-y')
  })

  it('should filter cached rows by facet like the API', () => {
    const items = [
      { feedCategories: ['春日经济'], feedKeywords: [] },
      { feedCategories: ['Other'], feedKeywords: ['春日经济'] },
    ] as AggregatedNewsItem[]
    const fk = { kind: 'fk' as const, value: '春日经济' }
    expect(applyFacetFilterToCachedOverviewItems(items, null)).toHaveLength(2)
    expect(applyFacetFilterToCachedOverviewItems(items, fk)).toHaveLength(2)
    expect(cachedOverviewHasMoreHint(false, null)).toBe(false)
    expect(cachedOverviewHasMoreHint(false, fk)).toBe(true)
  })

  it('should validate cache payload shape', () => {
    expect(isNewsFeedOverviewCachePayload(null)).toBe(false)
    expect(isNewsFeedOverviewCachePayload({ items: [], hasMore: false, errors: [] })).toBe(true)
    expect(isNewsFeedOverviewCachePayload({ items: [], hasMore: false, errors: [], warmupSources: [{ sourceId: 'a', message: 'warming' }] })).toBe(true)
    expect(isNewsFeedOverviewCachePayload({ items: [], hasMore: false, errors: [], warmupSources: [{ sourceId: 'a' }] })).toBe(false)
    expect(isNewsFeedOverviewCachePayload({ items: [], hasMore: true })).toBe(false)
  })

  it('should keep the browser overview cache TTL at 10 minutes', () => {
    expect(NEWS_FEED_OVERVIEW_IDB_TTL_MS).toBe(600 * 1000)
  })

  it('should bypass fresh cache hits when warmup-pending sources still need refill', () => {
    expect(
      shouldBypassFreshNewsFeedOverviewCache({
        items: [],
        errors: [],
        facets: null,
        sourceInventory: null,
        uniqueAfterDedupe: null,
        hasMore: false,
        warmupPending: true,
      })
    ).toBe(true)
    expect(
      shouldBypassFreshNewsFeedOverviewCache({
        items: [],
        errors: [],
        warmupSources: [{ sourceId: 'a', message: 'warming' }],
        facets: null,
        sourceInventory: null,
        uniqueAfterDedupe: null,
        hasMore: false,
      })
    ).toBe(true)
    expect(
      shouldBypassFreshNewsFeedOverviewCache({
        items: [],
        errors: [],
        facets: null,
        sourceInventory: null,
        uniqueAfterDedupe: null,
        hasMore: false,
      })
    ).toBe(false)
  })

  it('should read cached warmup sources safely for UI hydration', () => {
    expect(
      getNewsFeedOverviewCachedWarmupSources({
        items: [],
        errors: [],
        warmupSources: [{ sourceId: 'a', message: 'warming' }],
        facets: null,
        sourceInventory: null,
        uniqueAfterDedupe: null,
        hasMore: false,
      })
    ).toEqual([{ sourceId: 'a', message: 'warming' }])
    expect(
      getNewsFeedOverviewCachedWarmupSources({
        items: [],
        errors: [],
        facets: null,
        sourceInventory: null,
        uniqueAfterDedupe: null,
        hasMore: false,
      })
    ).toEqual([])
  })
})
