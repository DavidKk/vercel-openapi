import {
  drainAbortedOverviewFetch,
  getNewsOverviewEmptyStateVisible,
  getNewsOverviewErrorBannerVisible,
  getNewsOverviewHeadRefreshVisible,
  getNewsOverviewL0HydrationView,
  getNewsOverviewLoadMoreEnabled,
  getNewsOverviewMainFeedSkeleton,
  isSameNewsOverviewSession,
  shouldPersistNewsOverviewL0,
} from '@/app/news/lib/news-feed-overview-display'
import type { NewsFeedOverviewCachePayload } from '@/services/news/browser/idb-cache'
import type { AggregatedNewsItem } from '@/services/news/types'

function basePayload(over: Partial<NewsFeedOverviewCachePayload> = {}): NewsFeedOverviewCachePayload {
  return {
    items: [],
    errors: [],
    facets: null,
    sourceInventory: null,
    uniqueAfterDedupe: null,
    hasMore: false,
    ...over,
  }
}

function item(partial: Partial<AggregatedNewsItem> & Pick<AggregatedNewsItem, 'title' | 'link' | 'sourceId'>): AggregatedNewsItem {
  return {
    sourceLabel: 'Src',
    category: 'general-news',
    region: 'cn',
    publishedAt: null,
    summary: null,
    ...partial,
  }
}

describe('news-feed-overview-display', () => {
  describe('getNewsOverviewL0HydrationView', () => {
    it('should pass through unfiltered pool page and mirror cached hasMore', () => {
      const rows = [item({ title: 'A', link: 'https://a', sourceId: 's1', feedCategories: ['x'] }), item({ title: 'B', link: 'https://b', sourceId: 's2' })]
      const cached = basePayload({ items: rows, hasMore: true })
      const v = getNewsOverviewL0HydrationView(cached, null)
      expect(v.displayItems).toHaveLength(2)
      expect(v.hasMore).toBe(true)
      expect(v.needsLoadingUntilNetwork).toBe(false)
    })

    it('should client-filter fk to match pool rules and assume hasMore until network when facet is active', () => {
      const rows = [
        item({ title: 'A', link: 'https://a', sourceId: 's1', feedKeywords: ['春日经济'] }),
        item({ title: 'B', link: 'https://b', sourceId: 's2', feedCategories: ['other'] }),
      ]
      const cached = basePayload({ items: rows, hasMore: false })
      const fk = { kind: 'fk' as const, value: '春日经济' }
      const v = getNewsOverviewL0HydrationView(cached, fk)
      expect(v.displayItems).toHaveLength(1)
      expect(v.displayItems[0]?.title).toBe('A')
      expect(v.hasMore).toBe(true)
      expect(v.needsLoadingUntilNetwork).toBe(false)
    })

    it('should set needsLoadingUntilNetwork when filtered view is empty from one L0 page', () => {
      const rows = [item({ title: 'B', link: 'https://b', sourceId: 's2', feedCategories: ['other'] })]
      const cached = basePayload({ items: rows, hasMore: false })
      const fk = { kind: 'fk' as const, value: '春日经济' }
      const v = getNewsOverviewL0HydrationView(cached, fk)
      expect(v.displayItems).toHaveLength(0)
      expect(v.needsLoadingUntilNetwork).toBe(true)
    })

    it('should set needsLoadingUntilNetwork when unfiltered L0 page is empty', () => {
      const cached = basePayload({ items: [], hasMore: false })
      const v = getNewsOverviewL0HydrationView(cached, null)
      expect(v.needsLoadingUntilNetwork).toBe(true)
    })
  })

  describe('getNewsOverviewMainFeedSkeleton', () => {
    it('should show skeleton when loading even if items exist', () => {
      expect(getNewsOverviewMainFeedSkeleton(true, false, 5)).toBe(true)
    })

    it('should show skeleton during bootstrap with empty list', () => {
      expect(getNewsOverviewMainFeedSkeleton(false, true, 0)).toBe(true)
    })

    it('should hide skeleton after bootstrap once items were painted from L0', () => {
      expect(getNewsOverviewMainFeedSkeleton(false, true, 3)).toBe(false)
    })

    it('should hide skeleton when not loading, not bootstrapping, and list empty (empty state zone)', () => {
      expect(getNewsOverviewMainFeedSkeleton(false, false, 0)).toBe(false)
    })
  })

  describe('getNewsOverviewHeadRefreshVisible', () => {
    it('should show top refresh skeleton while cached rows stay visible during the first network refresh', () => {
      expect(getNewsOverviewHeadRefreshVisible(false, false, 5, false)).toBe(true)
    })

    it('should hide top refresh skeleton once the first request settles', () => {
      expect(getNewsOverviewHeadRefreshVisible(false, true, 5, false)).toBe(false)
    })

    it('should hide top refresh skeleton when there are no visible rows yet', () => {
      expect(getNewsOverviewHeadRefreshVisible(false, false, 0, false)).toBe(false)
    })

    it('should still show top refresh skeleton during warmup poll or manual retry', () => {
      expect(getNewsOverviewHeadRefreshVisible(false, true, 5, true)).toBe(true)
    })
  })

  describe('getNewsOverviewEmptyStateVisible', () => {
    it('should show empty only when not skeleton, no items, no error', () => {
      expect(getNewsOverviewEmptyStateVisible(false, 0, null)).toBe(true)
    })

    it('should hide empty when skeleton is on', () => {
      expect(getNewsOverviewEmptyStateVisible(true, 0, null)).toBe(false)
    })

    it('should hide empty when there is an error string', () => {
      expect(getNewsOverviewEmptyStateVisible(false, 0, 'failed')).toBe(false)
    })

    it('should hide empty when items exist', () => {
      expect(getNewsOverviewEmptyStateVisible(false, 2, null)).toBe(false)
    })
  })

  describe('getNewsOverviewErrorBannerVisible', () => {
    it('should show error banner only when not loading, bootstrap done, no items', () => {
      expect(getNewsOverviewErrorBannerVisible('x', false, false, 0)).toBe(true)
    })

    it('should hide error during loading', () => {
      expect(getNewsOverviewErrorBannerVisible('x', true, false, 0)).toBe(false)
    })

    it('should hide error during feed session bootstrap', () => {
      expect(getNewsOverviewErrorBannerVisible('x', false, true, 0)).toBe(false)
    })

    it('should hide error when items were hydrated', () => {
      expect(getNewsOverviewErrorBannerVisible('x', false, false, 1)).toBe(false)
    })

    it('should hide when error is null', () => {
      expect(getNewsOverviewErrorBannerVisible(null, false, false, 0)).toBe(false)
    })
  })

  describe('isSameNewsOverviewSession', () => {
    it('should match only when token, slug, and facet are unchanged', () => {
      expect(
        isSameNewsOverviewSession({ token: 7, listSlug: 'headlines', facet: { kind: 'fk', value: 'ai' } }, { token: 7, listSlug: 'headlines', facet: { kind: 'fk', value: 'ai' } })
      ).toBe(true)
    })

    it('should reject stale sessions when token or facet changed', () => {
      expect(
        isSameNewsOverviewSession({ token: 8, listSlug: 'headlines', facet: { kind: 'fk', value: 'ai' } }, { token: 7, listSlug: 'headlines', facet: { kind: 'fk', value: 'ai' } })
      ).toBe(false)
      expect(
        isSameNewsOverviewSession(
          { token: 7, listSlug: 'headlines', facet: { kind: 'src', sourceId: 'bbc-world' } },
          { token: 7, listSlug: 'headlines', facet: { kind: 'fk', value: 'ai' } }
        )
      ).toBe(false)
    })
  })

  describe('getNewsOverviewLoadMoreEnabled', () => {
    it('should keep load more disabled until the first network request settles', () => {
      expect(getNewsOverviewLoadMoreEnabled(false, false, true, false, 5)).toBe(false)
    })

    it('should enable load more only when the list has rows and pagination is ready', () => {
      expect(getNewsOverviewLoadMoreEnabled(false, false, true, true, 5)).toBe(true)
      expect(getNewsOverviewLoadMoreEnabled(false, false, true, true, 0)).toBe(false)
      expect(getNewsOverviewLoadMoreEnabled(false, false, false, true, 5)).toBe(false)
    })
  })

  describe('shouldPersistNewsOverviewL0', () => {
    it('should persist only when no facet and envelope ok', () => {
      expect(shouldPersistNewsOverviewL0(null, undefined)).toBe(true)
      expect(shouldPersistNewsOverviewL0(null, 0)).toBe(true)
    })

    it('should not persist when facet is set', () => {
      expect(shouldPersistNewsOverviewL0({ kind: 'fk', value: 'k' }, 0)).toBe(false)
    })

    it('should not persist when envelope reports failure', () => {
      expect(shouldPersistNewsOverviewL0(null, 1)).toBe(false)
    })
  })

  describe('drainAbortedOverviewFetch', () => {
    it('should return a fulfilled promise when the fetch promise rejects with AbortError', async () => {
      const p = Promise.reject(new DOMException('aborted', 'AbortError'))
      await expect(drainAbortedOverviewFetch(p)).resolves.toBeUndefined()
    })
  })
})
