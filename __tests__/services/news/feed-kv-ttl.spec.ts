import type { NewsFeedPoolCachePayload } from '@/services/news/feed/aggregate-feed'
import { getNewsFeedPoolKvTtlSecondsForListSlug, getNewsFeedPoolPayloadAgeMs, getNewsFeedPoolRefreshIntervalMs } from '@/services/news/feed/feed-kv-cache'

describe('feed-kv-cache TTL and refresh helpers', () => {
  const keys = ['NEWS_FEED_KV_TTL_SECONDS', 'NEWS_FEED_POOL_REFRESH_MS'] as const
  const saved: Partial<Record<(typeof keys)[number], string | undefined>> = {}

  beforeEach(() => {
    for (const k of keys) {
      saved[k] = process.env[k]
    }
  })

  afterEach(() => {
    for (const k of keys) {
      const v = saved[k]
      if (v === undefined) {
        delete process.env[k]
      } else {
        process.env[k] = v
      }
    }
  })

  it('should derive KV TTL from recent window hours when NEWS_FEED_KV_TTL_SECONDS is unset', () => {
    delete process.env.NEWS_FEED_KV_TTL_SECONDS
    expect(getNewsFeedPoolKvTtlSecondsForListSlug('headlines')).toBe(24 * 3600)
    /** Capped at POOL_MAX_TTL_SEC (86400): media default window is 72h but KV TTL cannot exceed platform max. */
    expect(getNewsFeedPoolKvTtlSecondsForListSlug('media')).toBe(86_400)
  })

  it('should use global NEWS_FEED_KV_TTL_SECONDS when set', () => {
    process.env.NEWS_FEED_KV_TTL_SECONDS = '7200'
    expect(getNewsFeedPoolKvTtlSecondsForListSlug('headlines')).toBe(7200)
    expect(getNewsFeedPoolKvTtlSecondsForListSlug('media')).toBe(7200)
  })

  it('should default pool refresh interval to 600000ms', () => {
    delete process.env.NEWS_FEED_POOL_REFRESH_MS
    expect(getNewsFeedPoolRefreshIntervalMs()).toBe(600_000)
  })

  it('should disable pool refresh when NEWS_FEED_POOL_REFRESH_MS=0', () => {
    process.env.NEWS_FEED_POOL_REFRESH_MS = '0'
    expect(getNewsFeedPoolRefreshIntervalMs()).toBe(0)
  })

  it('should compute payload age from lastMergedAtMs', () => {
    const t = Date.now() - 60_000
    const payload = {
      pool: [],
      baseUrl: 'https://x',
      facets: { categories: [], keywords: [], sources: [] },
      errors: [],
      fetchedAt: new Date(t).toISOString(),
      windowAtMs: t,
      lastMergedAtMs: t,
      sourcesRequested: 0,
      sourcesWithItems: 0,
      sourcesEmptyOrFailed: 0,
      rawItemCount: 0,
      droppedMissingLink: 0,
      duplicateDropped: 0,
      duplicateDroppedByTitle: 0,
      droppedOutsideRecentWindow: 0,
      recentWindowHours: 24,
    } satisfies NewsFeedPoolCachePayload
    const age = getNewsFeedPoolPayloadAgeMs(payload)
    expect(age).toBeGreaterThanOrEqual(59_000)
    expect(age).toBeLessThan(120_000)
  })
})
