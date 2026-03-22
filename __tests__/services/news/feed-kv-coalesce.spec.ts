jest.mock('@/services/news/feed/aggregate-feed', () => {
  const actual = jest.requireActual('@/services/news/feed/aggregate-feed')
  return {
    ...actual,
    mergeNewsFeedsToPool: jest.fn(),
  }
})

import type { NewsFeedMergedPool } from '@/services/news/feed/aggregate-feed'
import * as aggregateFeed from '@/services/news/feed/aggregate-feed'
import { getOrBuildNewsFeedMergedPool } from '@/services/news/feed/feed-kv-cache'
import type { NewsSourceConfig } from '@/services/news/types'

function makeMinimalMergedPool(): NewsFeedMergedPool {
  return {
    pool: [],
    facets: { categories: [], keywords: [], sources: [] },
    errors: [],
    fetchedAt: new Date(17_000_000_000_000).toISOString(),
    windowAtMs: 17_000_000_000_000,
    lastMergedAtMs: 17_000_000_000_000,
    sourcesRequested: 1,
    sourcesWithItems: 0,
    sourcesEmptyOrFailed: 1,
    rawItemCount: 0,
    droppedMissingLink: 0,
    duplicateDropped: 0,
    duplicateDroppedByTitle: 0,
    droppedOutsideRecentWindow: 0,
    recentWindowHours: 24,
  }
}

const testSource: NewsSourceConfig = {
  id: 'coalesce-test',
  label: 'Coalesce test',
  category: 'general-news',
  subcategory: '',
  region: 'cn',
  rsshubPath: '/test/feed',
}

describe('getOrBuildNewsFeedMergedPool RSS coalescing', () => {
  const prevDisable = process.env.DISABLE_CACHE

  beforeEach(() => {
    process.env.DISABLE_CACHE = '1'
    jest.mocked(aggregateFeed.mergeNewsFeedsToPool).mockImplementation(
      () =>
        new Promise((resolve) => {
          const t = setTimeout(() => resolve(makeMinimalMergedPool()), 45)
          t.unref()
        })
    )
  })

  afterEach(() => {
    process.env.DISABLE_CACHE = prevDisable
    jest.mocked(aggregateFeed.mergeNewsFeedsToPool).mockReset()
  })

  it('should call mergeNewsFeedsToPool once when concurrent getOrBuild share the same poolCacheKey', async () => {
    const key = 'news:feedpool:v3:coalesce-test-key'
    const n = 8
    const results = await Promise.all(
      Array.from({ length: n }, () =>
        getOrBuildNewsFeedMergedPool({
          poolCacheKey: key,
          sources: [testSource],
          baseUrl: 'https://rss.example',
          windowAtMs: 17_000_000_000_000,
          listSlug: 'headlines',
        })
      )
    )
    expect(jest.mocked(aggregateFeed.mergeNewsFeedsToPool)).toHaveBeenCalledTimes(1)
    expect(results).toHaveLength(n)
    for (const r of results) {
      expect(r.poolRefreshStatus).toBe('none')
      expect(r.payload.pool).toEqual([])
    }
  })
})
