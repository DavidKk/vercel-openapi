jest.mock('next/server', () => ({
  after: jest.fn((cb: () => void | Promise<void>) => {
    void Promise.resolve().then(cb)
  }),
}))

import { alignWindowMsToTtlBucket, buildNewsFeedPoolCacheKey, isNewsFeedPoolCachePayload, resolveNewsFeedWindowMs } from '@/services/news/feed-kv-cache'

describe('feed-kv-cache (pool)', () => {
  it('should produce the same pool cache key for identical pool dimensions (no window in key)', async () => {
    const parts = {
      baseUrl: 'https://rss.example',
      category: 'general-news',
      region: '',
      maxFeeds: 15,
    }
    const a = await buildNewsFeedPoolCacheKey(parts)
    const b = await buildNewsFeedPoolCacheKey(parts)
    expect(a).toBe(b)
    expect(a.startsWith('news:feedpool:v3:')).toBe(true)
  })

  it('should use same key for same feed config (window does not affect key)', async () => {
    const base = {
      baseUrl: 'https://rss.example',
      category: 'general-news',
      region: '',
      maxFeeds: 15,
    }
    const x = await buildNewsFeedPoolCacheKey(base)
    const y = await buildNewsFeedPoolCacheKey(base)
    expect(x).toBe(y)
  })

  it('should validate pool cache JSON shape', () => {
    expect(isNewsFeedPoolCachePayload(null)).toBe(false)
    expect(isNewsFeedPoolCachePayload({})).toBe(false)
    expect(
      isNewsFeedPoolCachePayload({
        pool: [],
        baseUrl: 'x',
        fetchedAt: 'y',
        windowAtMs: 1,
        facets: { categories: [], keywords: [], sources: [] },
        errors: [],
      })
    ).toBe(true)
    expect(
      isNewsFeedPoolCachePayload({
        pool: [],
        baseUrl: 'x',
        fetchedAt: 'y',
        windowAtMs: 1,
        lastMergedAtMs: NaN,
        facets: { categories: [], keywords: [], sources: [] },
        errors: [],
      })
    ).toBe(false)
  })

  it('should align window to TTL bucket (legacy helper)', () => {
    const ttl = 600_000
    expect(alignWindowMsToTtlBucket(1_234_567, ttl)).toBe(1_200_000)
    expect(alignWindowMsToTtlBucket(600_000, ttl)).toBe(600_000)
    expect(alignWindowMsToTtlBucket(0, ttl)).toBe(0)
  })

  it('should resolve window from anchor', () => {
    const anchor = '2020-01-01T00:00:00.000Z'
    expect(resolveNewsFeedWindowMs({ feedAnchorRaw: anchor, offset: 0 })).toBe(Date.parse(anchor))
  })

  it('should use Date.now() when no anchor', () => {
    const t0 = Date.now()
    const w = resolveNewsFeedWindowMs({ feedAnchorRaw: undefined, offset: 0 })
    expect(w).toBeGreaterThanOrEqual(t0)
    expect(w).toBeLessThanOrEqual(Date.now() + 1_000)
  })
})
