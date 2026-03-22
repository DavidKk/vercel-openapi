import { filterRssFacetLabels, shouldDropRssFacetLabel, stripRssFacetLabelsFromAggregatedItem } from '@/services/news/facets/rss-facet-label-filter'
import type { AggregatedNewsItem } from '@/services/news/types'

describe('rss-facet-label-filter', () => {
  it('should remove desk / generic labels from denylist', () => {
    expect(filterRssFacetLabels(['政治', '伊朗', '国际'])).toEqual(['伊朗'])
    expect(filterRssFacetLabels(['中国', '重庆大学'])).toEqual(['重庆大学'])
    expect(filterRssFacetLabels(['美国', '美伊冲突'])).toEqual(['美伊冲突'])
    expect(filterRssFacetLabels(['要闻', '赖清德'])).toEqual(['赖清德'])
  })

  it('should match English denylist case-insensitively', () => {
    expect(filterRssFacetLabels(['Culture', 'BTS'])).toEqual(['BTS'])
    expect(filterRssFacetLabels(['United States', 'Ukraine'])).toEqual(['Ukraine'])
    expect(shouldDropRssFacetLabel('floods')).toBe(true)
    expect(shouldDropRssFacetLabel('world')).toBe(true)
  })

  it('should keep concrete entities not on denylist', () => {
    expect(filterRssFacetLabels(['赖清德', '清华大学', '美伊冲突'])).toEqual(['赖清德', '清华大学', '美伊冲突'])
  })

  it('should strip denied labels from aggregated items for API responses', () => {
    const item: AggregatedNewsItem = {
      title: 'T',
      link: 'https://ex.test/x',
      publishedAt: '2020-01-01T00:00:00.000Z',
      summary: null,
      sourceId: 'src',
      sourceLabel: 'S',
      category: 'general-news',
      region: 'cn',
      feedCategories: ['政治', '重庆大学'],
      feedKeywords: ['国际', '量子'],
    }
    const out = stripRssFacetLabelsFromAggregatedItem(item)
    expect(out.feedCategories).toEqual(['重庆大学'])
    expect(out.feedKeywords).toEqual(['量子'])
  })

  it('should merge RSS_FACET_DENYLIST_EXTRA after resetModules', async () => {
    const prev = process.env.RSS_FACET_DENYLIST_EXTRA
    process.env.RSS_FACET_DENYLIST_EXTRA = '臨時屏蔽, temp-block'
    jest.resetModules()
    const { filterRssFacetLabels: filterWithExtra, shouldDropRssFacetLabel: dropWithExtra } = await import('@/services/news/facets/rss-facet-label-filter')
    expect(filterWithExtra(['臨時屏蔽', '賴清德'])).toEqual(['賴清德'])
    expect(dropWithExtra('TEMP-BLOCK')).toBe(true)
    if (prev === undefined) {
      delete process.env.RSS_FACET_DENYLIST_EXTRA
    } else {
      process.env.RSS_FACET_DENYLIST_EXTRA = prev
    }
    jest.resetModules()
    await import('@/services/news/facets/rss-facet-label-filter')
  })
})
