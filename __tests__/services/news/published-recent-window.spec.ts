import { filterToRecentPublished, getNewsFeedRecentWindowHoursForListSlug, isPublishedWithinRecentWindow } from '@/services/news/feed/published-recent-window'
import type { AggregatedNewsItem } from '@/services/news/types'

function mockItem(publishedAt: string | null): AggregatedNewsItem {
  return {
    title: 't',
    link: 'https://example.com/a',
    publishedAt,
    summary: null,
    sourceId: 'x',
    sourceLabel: 'X',
    category: 'general-news',
    region: 'cn',
  }
}

describe('published-recent-window', () => {
  const prevRecentEnv = process.env.NEWS_FEED_RECENT_HOURS

  afterEach(() => {
    if (prevRecentEnv === undefined) {
      delete process.env.NEWS_FEED_RECENT_HOURS
    } else {
      process.env.NEWS_FEED_RECENT_HOURS = prevRecentEnv
    }
  })

  it('should map list slugs to longer windows than headlines', () => {
    delete process.env.NEWS_FEED_RECENT_HOURS
    expect(getNewsFeedRecentWindowHoursForListSlug('')).toBe(24)
    expect(getNewsFeedRecentWindowHoursForListSlug('headlines')).toBe(24)
    expect(getNewsFeedRecentWindowHoursForListSlug('stem')).toBe(168)
    expect(getNewsFeedRecentWindowHoursForListSlug('media')).toBe(72)
  })

  it('should use global env only for empty list slug (all-pool)', () => {
    process.env.NEWS_FEED_RECENT_HOURS = '48'
    expect(getNewsFeedRecentWindowHoursForListSlug('')).toBe(48)
    expect(getNewsFeedRecentWindowHoursForListSlug('stem')).toBe(168)
  })

  it('should accept timestamps within the last 24 hours', () => {
    const nowMs = Date.parse('2026-03-21T12:00:00.000Z')
    expect(isPublishedWithinRecentWindow('2026-03-21T11:00:00.000Z', 24, nowMs)).toBe(true)
    expect(isPublishedWithinRecentWindow('2026-03-20T12:00:01.000Z', 24, nowMs)).toBe(true)
  })

  it('should reject timestamps older than the window', () => {
    const nowMs = Date.parse('2026-03-21T12:00:00.000Z')
    expect(isPublishedWithinRecentWindow('2026-03-20T11:59:59.000Z', 24, nowMs)).toBe(false)
  })

  it('should accept null and unparseable publishedAt like unknown time', () => {
    const nowMs = Date.parse('2026-03-21T12:00:00.000Z')
    expect(isPublishedWithinRecentWindow(null, 24, nowMs)).toBe(true)
    expect(isPublishedWithinRecentWindow('not-a-date', 24, nowMs)).toBe(true)
  })

  it('should filter list and count drops', () => {
    const nowMs = Date.parse('2026-03-21T12:00:00.000Z')
    const items = [mockItem('2026-03-21T10:00:00.000Z'), mockItem('2026-03-19T12:00:00.000Z'), mockItem(null), mockItem('bogus-pub-date')]
    const { kept, droppedOutsideRecentWindow } = filterToRecentPublished(items, 24, nowMs)
    expect(kept).toHaveLength(3)
    expect(droppedOutsideRecentWindow).toBe(1)
  })
})
