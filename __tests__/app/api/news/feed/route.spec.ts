jest.mock('next/server', () => jest.requireActual('next/server'))

const mockGetOrBuildNewsFeedMergedPool = jest.fn()

jest.mock('@/services/news/feed-kv-cache', () => {
  const actual = jest.requireActual('@/services/news/feed-kv-cache')
  return {
    ...actual,
    getOrBuildNewsFeedMergedPool: (...args: Parameters<typeof actual.getOrBuildNewsFeedMergedPool>) => mockGetOrBuildNewsFeedMergedPool(...args),
  }
})

import { NextRequest } from 'next/server'

import { GET } from '@/app/api/news/feed/route'
import type { NewsFeedPoolCachePayload } from '@/services/news/aggregate-feed'
import type { AggregatedNewsItem } from '@/services/news/types'

function makePoolPayload(overrides: Partial<NewsFeedPoolCachePayload> = {}): NewsFeedPoolCachePayload {
  const now = Date.now()
  const item: AggregatedNewsItem = {
    title: 'Cron test headline',
    link: `https://example.com/item-${now}`,
    publishedAt: new Date(now).toISOString(),
    summary: null,
    sourceId: 'test-source',
    sourceLabel: 'Test source',
    category: 'general-news',
    region: 'cn',
  }
  return {
    pool: [item],
    baseUrl: 'https://rsshub.app',
    facets: { categories: [], keywords: [], sources: [] },
    errors: [],
    fetchedAt: new Date(now).toISOString(),
    windowAtMs: now,
    lastMergedAtMs: now,
    sourcesRequested: 1,
    sourcesWithItems: 1,
    sourcesEmptyOrFailed: 0,
    rawItemCount: 1,
    droppedMissingLink: 0,
    duplicateDropped: 0,
    duplicateDroppedByTitle: 0,
    droppedOutsideRecentWindow: 0,
    recentWindowHours: 24,
    ...overrides,
  }
}

describe('GET /api/news/feed', () => {
  beforeEach(() => {
    mockGetOrBuildNewsFeedMergedPool.mockResolvedValue({
      payload: makePoolPayload(),
      poolLayerHit: null,
    })
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  it('should return 400 for invalid category', async () => {
    const req = new NextRequest('http://localhost/api/news/feed?category=bad', { method: 'GET' })
    const res = await GET(req, { params: Promise.resolve({}) })
    expect(res.status).toBe(400)
  })

  it('should return 400 for invalid region', async () => {
    const req = new NextRequest('http://localhost/api/news/feed?region=eu', { method: 'GET' })
    const res = await GET(req, { params: Promise.resolve({}) })
    expect(res.status).toBe(400)
  })

  it('should return 400 for invalid list', async () => {
    const req = new NextRequest('http://localhost/api/news/feed?list=not-a-real-slug', { method: 'GET' })
    const res = await GET(req, { params: Promise.resolve({}) })
    expect(res.status).toBe(400)
  })

  it('should return 400 for invalid limit', async () => {
    const req = new NextRequest('http://localhost/api/news/feed?limit=0', { method: 'GET' })
    const res = await GET(req, { params: Promise.resolve({}) })
    expect(res.status).toBe(400)
  })

  it('should return 400 for invalid maxFeeds', async () => {
    const req = new NextRequest('http://localhost/api/news/feed?maxFeeds=abc', { method: 'GET' })
    const res = await GET(req, { params: Promise.resolve({}) })
    expect(res.status).toBe(400)
  })

  it('should return 400 for invalid offset', async () => {
    const req = new NextRequest('http://localhost/api/news/feed?offset=-1', { method: 'GET' })
    const res = await GET(req, { params: Promise.resolve({}) })
    expect(res.status).toBe(400)
  })

  it('should return 400 for invalid feedAnchor', async () => {
    const req = new NextRequest('http://localhost/api/news/feed?feedAnchor=not-a-date', { method: 'GET' })
    const res = await GET(req, { params: Promise.resolve({}) })
    expect(res.status).toBe(400)
  })

  it('should return 400 when multiple facet query params are set', async () => {
    const req = new NextRequest('http://localhost/api/news/feed?feedCategory=a&feedKeyword=b', { method: 'GET' })
    const res = await GET(req, { params: Promise.resolve({}) })
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(String(body.message)).toMatch(/facet/i)
  })

  it('should return 200 with items when pool resolves', async () => {
    const req = new NextRequest('http://localhost/api/news/feed?category=general-news&limit=5', {
      method: 'GET',
    })
    const res = await GET(req, { params: Promise.resolve({}) })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.code).toBe(0)
    expect(Array.isArray(body.data?.items)).toBe(true)
    expect(body.data.items.length).toBe(1)
    expect(body.data.items[0].title).toBe('Cron test headline')
    expect(body.data.mergeStats).toBeDefined()
    expect(body.data.facets).toBeDefined()
    expect(mockGetOrBuildNewsFeedMergedPool).toHaveBeenCalled()
  })

  it('should pass only manifest sources for game-entertainment (not global first-15 slice)', async () => {
    const req = new NextRequest('http://localhost/api/news/feed?category=game-entertainment&limit=5', {
      method: 'GET',
    })
    const res = await GET(req, { params: Promise.resolve({}) })
    expect(res.status).toBe(200)
    expect(mockGetOrBuildNewsFeedMergedPool).toHaveBeenCalled()
    const arg = mockGetOrBuildNewsFeedMergedPool.mock.calls[0]![0] as {
      sources: { id: string }[]
      itemCategory?: string
    }
    expect(arg.itemCategory).toBe('game-entertainment')
    expect(arg.sources.map((s) => s.id)).toContain('xiaoheihe')
    expect(arg.sources.length).toBeGreaterThan(0)
  })

  it('should scope tech-internet to developer sub-tab when sub=developer', async () => {
    const req = new NextRequest('http://localhost/api/news/feed?category=tech-internet&sub=developer&limit=5', {
      method: 'GET',
    })
    const res = await GET(req, { params: Promise.resolve({}) })
    expect(res.status).toBe(200)
    const arg = mockGetOrBuildNewsFeedMergedPool.mock.calls[0]![0] as {
      sources: { id: string }[]
      poolCacheKey: string
    }
    expect(arg.sources.map((s) => s.id)).toContain('solidot')
    expect(typeof arg.poolCacheKey).toBe('string')
  })

  it('should scope developer pool when list=developer', async () => {
    const req = new NextRequest('http://localhost/api/news/feed?list=developer&limit=5', { method: 'GET' })
    const res = await GET(req, { params: Promise.resolve({}) })
    expect(res.status).toBe(200)
    const arg = mockGetOrBuildNewsFeedMergedPool.mock.calls[0]![0] as {
      sources: { id: string }[]
      itemCategory?: string
    }
    expect(arg.itemCategory).toBe('tech-internet')
    expect(arg.sources.map((s) => s.id)).toContain('solidot')
  })

  it('should set X-Cache-Hit when pool served from cache', async () => {
    mockGetOrBuildNewsFeedMergedPool.mockResolvedValue({
      payload: makePoolPayload(),
      poolLayerHit: 'l1',
    })
    const req = new NextRequest('http://localhost/api/news/feed', { method: 'GET' })
    const res = await GET(req, { params: Promise.resolve({}) })
    expect(res.status).toBe(200)
    expect(res.headers.get('X-Cache-Hit')).toBe('L1')
  })
})
