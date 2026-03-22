import { randomUUID } from 'node:crypto'

import { MAX_POOL_KEYWORD_FACETS } from '@/services/news/config/feed-keyword-budgets'
import {
  attachFinalizedTopicKeywordsToNewsPool,
  buildFeedFacetsFromPool,
  type NewsFeedPoolCachePayload,
  pruneNewsFeedPoolPayloadForWindow,
  reconcileNewsFeedPoolAfterFailedSourceRetry,
  reconcileNewsFeedPoolAfterRssFetch,
  sliceNewsFeedPageFromPool,
} from '@/services/news/feed/aggregate-feed'
import type { NewsSourceConfig } from '@/services/news/types'

const mockSources: NewsSourceConfig[] = [
  {
    id: 'src-a',
    label: 'A',
    category: 'general-news',
    subcategory: 'headlines',
    region: 'cn',
    rsshubPath: '/a',
  },
  {
    id: 'src-b',
    label: 'B',
    category: 'general-news',
    subcategory: 'headlines',
    region: 'cn',
    rsshubPath: '/b',
  },
]

function basePayload(pool: NewsFeedPoolCachePayload['pool']): NewsFeedPoolCachePayload {
  const now = Date.now()
  return {
    pool,
    baseUrl: 'https://rss.test',
    facets: { categories: [], keywords: [], sources: [] },
    errors: [],
    fetchedAt: new Date(now).toISOString(),
    windowAtMs: now,
    sourcesRequested: 2,
    sourcesWithItems: 2,
    sourcesEmptyOrFailed: 0,
    rawItemCount: pool.length,
    droppedMissingLink: 0,
    duplicateDropped: 0,
    duplicateDroppedByTitle: 0,
    droppedOutsideRecentWindow: 0,
    recentWindowHours: 24,
  }
}

describe('aggregate-feed pool slice + reconcile', () => {
  it('should cap keyword facet histogram rows by pool budget', () => {
    const now = Date.now()
    const iso = new Date(now).toISOString()
    /** Distinct labels so substring/fuzzy facet merge does not fold the pool into one row. */
    const pool = Array.from({ length: 130 }, () => ({
      title: 'T',
      link: `https://ex.test/kw-cap/${randomUUID()}`,
      publishedAt: iso,
      summary: null,
      sourceId: 'src-a',
      sourceLabel: 'A',
      category: 'general-news' as const,
      region: 'cn' as const,
      feedKeywords: [randomUUID()],
    }))
    const facets = buildFeedFacetsFromPool(pool)
    expect(facets.keywords).toHaveLength(MAX_POOL_KEYWORD_FACETS)
  })

  it('should omit denylisted RSS labels from facet histogram (including cached pool rows)', () => {
    const now = Date.now()
    const row = {
      title: 'T',
      link: 'https://ex.test/facet-deny',
      publishedAt: new Date(now).toISOString(),
      summary: null,
      sourceId: 'src-a',
      sourceLabel: 'A',
      category: 'general-news' as const,
      region: 'cn' as const,
      feedCategories: ['國際', '重庆大学'],
      feedKeywords: ['政治', 'BTS'],
    }
    const facets = buildFeedFacetsFromPool([row])
    expect(facets.categories.map((x) => x.value)).toEqual(['重庆大学'])
    /** Keywords histogram is category ∪ keyword per item (deduped once per article). */
    expect(facets.keywords.map((x) => x.value).sort()).toEqual(['BTS', '重庆大学'].sort())
  })

  it('should slice page with offset and limit', () => {
    const now = Date.now()
    const pool = [1, 2, 3].map((i) => ({
      title: `T${i}`,
      link: `https://ex.test/${i}`,
      publishedAt: new Date(now).toISOString(),
      summary: null,
      sourceId: 'src-a',
      sourceLabel: 'A',
      category: 'general-news' as const,
      region: 'cn' as const,
    }))
    const payload = basePayload(pool)
    const page = sliceNewsFeedPageFromPool(payload, { itemOffset: 1, itemLimit: 2 })
    expect(page.items.map((x) => x.title)).toEqual(['T2', 'T3'])
    expect(page.mergeStats.hasMore).toBe(false)
    expect(page.mergeStats.uniqueAfterDedupe).toBe(3)
  })

  it('should reconcile previous pool with fresh merge and dedupe by URL', () => {
    const now = Date.now()
    const iso = new Date(now).toISOString()
    const sharedLink = 'https://dup.example/post'
    const previousItems = [
      {
        title: 'Old title',
        link: sharedLink,
        publishedAt: iso,
        summary: null,
        sourceId: 'src-a',
        sourceLabel: 'A',
        category: 'general-news' as const,
        region: 'cn' as const,
      },
    ]
    const fresh = {
      pool: [
        {
          title: 'New title same url',
          link: sharedLink,
          publishedAt: iso,
          summary: null,
          sourceId: 'src-b',
          sourceLabel: 'B',
          category: 'general-news' as const,
          region: 'cn' as const,
        },
      ],
      facets: { categories: [], keywords: [], sources: [] },
      errors: [] as { sourceId: string; message: string }[],
      fetchedAt: iso,
      windowAtMs: now,
      sourcesRequested: 2,
      sourcesWithItems: 1,
      sourcesEmptyOrFailed: 0,
      rawItemCount: 1,
      droppedMissingLink: 0,
      duplicateDropped: 0,
      duplicateDroppedByTitle: 0,
      droppedOutsideRecentWindow: 0,
      recentWindowHours: 24,
    }
    const merged = reconcileNewsFeedPoolAfterRssFetch({
      previousItems,
      fresh,
      sources: mockSources,
      itemCategory: undefined,
    })
    expect(merged.pool.length).toBe(1)
    expect(merged.duplicateDropped).toBe(1)
  })

  it('should merge partial retry errors and drop retried ids from previous errors when fixed', () => {
    const now = Date.now()
    const iso = new Date(now).toISOString()
    const previousItems = [
      {
        title: 'From A',
        link: 'https://ex.test/a',
        publishedAt: iso,
        summary: null,
        sourceId: 'src-a',
        sourceLabel: 'A',
        category: 'general-news' as const,
        region: 'cn' as const,
      },
    ]
    const freshPartial = {
      pool: [
        {
          title: 'From B now',
          link: 'https://ex.test/b',
          publishedAt: iso,
          summary: null,
          sourceId: 'src-b',
          sourceLabel: 'B',
          category: 'general-news' as const,
          region: 'cn' as const,
        },
      ],
      facets: { categories: [], keywords: [], sources: [] },
      errors: [] as { sourceId: string; message: string }[],
      fetchedAt: iso,
      windowAtMs: now,
      sourcesRequested: 1,
      sourcesWithItems: 1,
      sourcesEmptyOrFailed: 0,
      rawItemCount: 1,
      droppedMissingLink: 0,
      duplicateDropped: 0,
      duplicateDroppedByTitle: 0,
      droppedOutsideRecentWindow: 0,
      recentWindowHours: 24,
    }
    const out = reconcileNewsFeedPoolAfterFailedSourceRetry({
      previousItems,
      previousErrors: [{ sourceId: 'src-b', message: 'timeout' }],
      freshPartial,
      retriedSourceIds: ['src-b'],
      allSources: mockSources,
      itemCategory: undefined,
    })
    expect(out.errors.some((e) => e.sourceId === 'src-b')).toBe(false)
    expect(out.pool.some((r) => r.link === 'https://ex.test/b')).toBe(true)
  })

  it('should preserve merge droppedOutsideRecentWindow when pruning pool for feedAnchor', () => {
    const nowMs = Date.parse('2026-03-21T12:00:00.000Z')
    const freshIso = new Date(nowMs).toISOString()
    const pool = [
      {
        title: 'Recent',
        link: 'https://ex.test/r',
        publishedAt: freshIso,
        summary: null,
        sourceId: 'src-a',
        sourceLabel: 'A',
        category: 'general-news' as const,
        region: 'cn' as const,
      },
    ]
    const payload: NewsFeedPoolCachePayload = {
      ...basePayload(pool),
      droppedOutsideRecentWindow: 23,
    }
    const pruned = pruneNewsFeedPoolPayloadForWindow(payload, nowMs)
    expect(pruned.pool).toHaveLength(1)
    expect(pruned.droppedOutsideRecentWindow).toBe(23)
  })

  it('should keep keyword facet count aligned with exact keyword matches after canonicalization', () => {
    const iso = '2026-03-21T12:00:00.000Z'
    const payload = basePayload([
      {
        title: '中国发展高层论坛2026年年会今日开幕',
        link: 'https://ex.test/forum-1',
        publishedAt: iso,
        summary: '中国发展高层论坛2026年年会今日开幕',
        sourceId: 'src-a',
        sourceLabel: 'A',
        category: 'general-news' as const,
        region: 'cn' as const,
        feedKeywords: ['高层论坛'],
      },
      {
        title: '韩文秀：稳步提升消费对经济增长的贡献',
        link: 'https://ex.test/forum-2',
        publishedAt: iso,
        summary: '韩文秀在中国发展高层论坛2026年年会表示将稳步提升消费对经济增长的贡献',
        sourceId: 'src-b',
        sourceLabel: 'B',
        category: 'general-news' as const,
        region: 'cn' as const,
        feedKeywords: ['高层论坛'],
      },
      {
        title: '发展高层会议讨论产业升级',
        link: 'https://ex.test/forum-3',
        publishedAt: iso,
        summary: '发展高层会议聚焦产业升级',
        sourceId: 'src-a',
        sourceLabel: 'A',
        category: 'general-news' as const,
        region: 'cn' as const,
        feedKeywords: ['发展高层'],
      },
    ])
    const out = attachFinalizedTopicKeywordsToNewsPool(payload)
    const keywordRow = out.facets.keywords.find((row) => row.value === '高层论坛')
    expect(keywordRow?.count).toBe(2)
    const matched = out.pool.filter((item) => item.feedKeywords?.includes('高层论坛'))
    expect(matched).toHaveLength(2)
  })
})
