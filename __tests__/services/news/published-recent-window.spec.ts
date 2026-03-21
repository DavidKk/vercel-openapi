import { filterToRecentPublished, isPublishedWithinRecentWindow } from '@/services/news/published-recent-window'
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
  it('should accept timestamps within the last 24 hours', () => {
    const nowMs = Date.parse('2026-03-21T12:00:00.000Z')
    expect(isPublishedWithinRecentWindow('2026-03-21T11:00:00.000Z', 24, nowMs)).toBe(true)
    expect(isPublishedWithinRecentWindow('2026-03-20T12:00:01.000Z', 24, nowMs)).toBe(true)
  })

  it('should reject timestamps older than the window', () => {
    const nowMs = Date.parse('2026-03-21T12:00:00.000Z')
    expect(isPublishedWithinRecentWindow('2026-03-20T11:59:59.000Z', 24, nowMs)).toBe(false)
  })

  it('should reject null or invalid publishedAt', () => {
    const nowMs = Date.parse('2026-03-21T12:00:00.000Z')
    expect(isPublishedWithinRecentWindow(null, 24, nowMs)).toBe(false)
    expect(isPublishedWithinRecentWindow('not-a-date', 24, nowMs)).toBe(false)
  })

  it('should filter list and count drops', () => {
    const nowMs = Date.parse('2026-03-21T12:00:00.000Z')
    const items = [mockItem('2026-03-21T10:00:00.000Z'), mockItem('2026-03-19T12:00:00.000Z'), mockItem(null)]
    const { kept, droppedOutsideRecentWindow } = filterToRecentPublished(items, 24, nowMs)
    expect(kept).toHaveLength(1)
    expect(droppedOutsideRecentWindow).toBe(2)
  })
})
