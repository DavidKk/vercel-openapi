import { buildNewsFeedOverviewIdbKey, isNewsFeedOverviewCachePayload } from '@/services/news/browser/idb-cache'

describe('news browser idb-cache', () => {
  it('should build stable keys for list size and facet dimensions', () => {
    expect(buildNewsFeedOverviewIdbKey('headlines', 20, null)).toBe('v1:overview:headlines:ps20:none')
    expect(buildNewsFeedOverviewIdbKey('media', 20, { kind: 'src', sourceId: 'x' })).toBe('v1:overview:media:ps20:src:x')
  })

  it('should validate cache payload shape', () => {
    expect(isNewsFeedOverviewCachePayload(null)).toBe(false)
    expect(isNewsFeedOverviewCachePayload({ items: [], hasMore: false, errors: [] })).toBe(true)
    expect(isNewsFeedOverviewCachePayload({ items: [], hasMore: true })).toBe(false)
  })
})
