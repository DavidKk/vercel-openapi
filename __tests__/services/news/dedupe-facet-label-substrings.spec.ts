import {
  collapseConsecutiveRepeatedChineseRuns,
  dedupeFacetLabelListForItem,
  dropOverlappingFacetLabels,
  mergeFacetHistogramRowsBySubstring,
  normalizeFacetLabelSurface,
} from '@/services/news/facets/dedupe-facet-label-substrings'
import { itemMatchesFacetListFilter } from '@/services/news/facets/facet-list-filter'
import { buildFeedFacetsFromPool } from '@/services/news/feed/aggregate-feed'
import type { AggregatedNewsItem } from '@/services/news/types'

describe('normalizeFacetLabelSurface', () => {
  it('should lowercase Latin letters and leave CJK unchanged', () => {
    expect(normalizeFacetLabelSurface('  AI芯片 ')).toBe('ai芯片')
  })

  it('should strip ASCII edge punctuation and collapse internal whitespace', () => {
    expect(normalizeFacetLabelSurface('  "Tech News"  ')).toBe('tech news')
  })
})

describe('collapseConsecutiveRepeatedChineseRuns', () => {
  it('should collapse duplicated adjacent CJK chunks used by noisy RSS keywords', () => {
    expect(collapseConsecutiveRepeatedChineseRuns('霍尔木霍尔木兹海峡')).toBe('霍尔木兹海峡')
  })

  it('should leave ASCII-only strings unchanged', () => {
    expect(collapseConsecutiveRepeatedChineseRuns('foofoo')).toBe('foofoo')
  })
})

describe('dedupeFacetLabelListForItem', () => {
  it('should drop shorter labels contained in a longer one', () => {
    expect(dedupeFacetLabelListForItem(['论坛高层', '论坛高层论坛', '其他'])).toEqual(['论坛高层论坛', '其他'])
  })

  it('should merge CJK reorder variants via fuzzball token_sort (min length 4)', () => {
    const out = dedupeFacetLabelListForItem(['高层论坛', '论坛高层', '其他'])
    expect(out).toHaveLength(2)
    expect(out).toContain('其他')
    const merged = out.find((s) => s !== '其他')
    expect(['高层论坛', '论坛高层']).toContain(merged)
  })

  it('should not merge 2-character CJK anagrams (蜜蜂 vs 蜂蜜)', () => {
    const out = dedupeFacetLabelListForItem(['蜜蜂', '蜂蜜'])
    expect(out.length).toBe(2)
  })

  it('should merge ASCII case variants into one bucket via shared norm key', () => {
    const out = dedupeFacetLabelListForItem(['AI', 'ai', 'other'])
    expect(out).toEqual(['ai', 'other'])
  })

  it('should merge same-length Latin typo variants via fuzzball ratio (step 3)', () => {
    const out = dedupeFacetLabelListForItem(['bitcoin', 'bitcion', 'other'])
    expect(out).toHaveLength(2)
    expect(out).toContain('other')
    const merged = out.find((s) => s !== 'other')
    expect(['bitcoin', 'bitcion']).toContain(merged)
  })

  it('should not merge distinct 4-char CJK labels with low ratio', () => {
    const out = dedupeFacetLabelListForItem(['人工智能', '人工职能'])
    expect(out.length).toBe(2)
  })

  it('should drop 霍尔木 when the longer label repeats 霍尔木 before 兹海峡', () => {
    expect(dedupeFacetLabelListForItem(['霍尔木', '霍尔木霍尔木兹海峡'])).toEqual(['霍尔木霍尔木兹海峡'])
  })

  it('should drop 霍尔海峡 as ordered subsequence of collapsed 霍尔木兹海峡', () => {
    expect(dedupeFacetLabelListForItem(['霍尔海峡', '霍尔木霍尔木兹海峡'])).toEqual(['霍尔木霍尔木兹海峡'])
  })

  it('should keep unrelated overlapping topics (no substring or gated subsequence)', () => {
    expect(dedupeFacetLabelListForItem(['发展高层', '论坛高层论坛']).sort()).toEqual(['发展高层', '论坛高层论坛'].sort())
  })

  it('should keep 海峡霍尔木 when it is not an ordered subsequence of the Hormuz-style long form', () => {
    expect(dedupeFacetLabelListForItem(['海峡霍尔木', '霍尔木霍尔木兹海峡']).sort()).toEqual(['海峡霍尔木', '霍尔木霍尔木兹海峡'].sort())
  })
})

describe('dropOverlappingFacetLabels', () => {
  it('should merge duplicate norm buckets before supersede pass', () => {
    expect(dropOverlappingFacetLabels(['霍尔木兹海峡', '霍尔木霍尔木兹海峡'])).toEqual(['霍尔木霍尔木兹海峡'])
  })
})

describe('mergeFacetHistogramRowsBySubstring', () => {
  it('should merge counts for CJK reorder variants after fuzzy pass', () => {
    const out = mergeFacetHistogramRowsBySubstring([
      { value: '高层论坛', count: 2 },
      { value: '论坛高层', count: 3 },
    ])
    expect(out).toEqual([{ value: '论坛高层', count: 5 }])
  })

  it('should prefer higher-count spelling when fuzzy merge ties length (pool-weighted step 4)', () => {
    const out = mergeFacetHistogramRowsBySubstring([
      { value: 'bitcion', count: 2 },
      { value: 'bitcoin', count: 9 },
    ])
    expect(out).toEqual([{ value: 'bitcoin', count: 11 }])
  })

  it('should prefer higher-count display for same norm and equal length (case variants)', () => {
    const out = mergeFacetHistogramRowsBySubstring([
      { value: 'AI', count: 1 },
      { value: 'ai', count: 5 },
    ])
    expect(out).toEqual([{ value: 'ai', count: 6 }])
  })

  it('should merge counts into the shortest substantive display key for filter recall', () => {
    const out = mergeFacetHistogramRowsBySubstring([
      { value: '论坛高层', count: 3 },
      { value: '论坛高层论坛', count: 3 },
    ])
    expect(out).toEqual([{ value: '论坛高层', count: 6 }])
  })

  it('should merge 霍尔木兹海峡 with 霍尔木兹 into one bucket labeled 霍尔木兹', () => {
    const out = mergeFacetHistogramRowsBySubstring([
      { value: '霍尔木兹海峡', count: 4 },
      { value: '霍尔木兹', count: 3 },
    ])
    expect(out).toEqual([{ value: '霍尔木兹', count: 7 }])
  })

  it('should roll 霍尔木 counts into shortest cluster rep after norm collapse (e.g. 霍尔木兹海峡)', () => {
    const out = mergeFacetHistogramRowsBySubstring([
      { value: '霍尔木', count: 2 },
      { value: '霍尔木霍尔木兹海峡', count: 5 },
    ])
    expect(out).toEqual([{ value: '霍尔木兹海峡', count: 7 }])
  })

  it('should roll Hormuz-style rows into the shortest substantive display after normalization', () => {
    const out = mergeFacetHistogramRowsBySubstring([
      { value: '霍尔海峡', count: 4 },
      { value: '霍尔木霍尔木兹海峡', count: 1 },
    ])
    expect(out).toEqual([{ value: '霍尔海峡', count: 5 }])
  })

  it('should not merge 海峡霍尔木 into 霍尔木霍尔木兹海峡 when subsequence rule does not apply', () => {
    const out = mergeFacetHistogramRowsBySubstring([
      { value: '海峡霍尔木', count: 2 },
      { value: '霍尔木霍尔木兹海峡', count: 3 },
    ])
    expect(out.length).toBe(2)
    const sum = out.reduce((a, r) => a + r.count, 0)
    expect(sum).toBe(5)
  })
})

describe('buildFeedFacetsFromPool keyword exact counts', () => {
  it('should keep distinct keyword facet keys separate so counts reflect exact article matches', () => {
    const now = Date.now()
    const base = {
      title: 'T',
      link: 'https://ex.test/k',
      publishedAt: new Date(now).toISOString(),
      summary: null,
      sourceId: 'src-a',
      sourceLabel: 'A',
      category: 'general-news' as const,
      region: 'cn' as const,
    }
    const pool: AggregatedNewsItem[] = [
      { ...base, link: 'https://ex.test/1', feedKeywords: ['论坛高层'] },
      { ...base, link: 'https://ex.test/2', feedKeywords: ['论坛高层论坛'] },
    ]
    const facets = buildFeedFacetsFromPool(pool)
    expect(facets.keywords.map((x) => x.value).sort()).toEqual(['论坛高层', '论坛高层论坛'].sort())
    expect(facets.keywords.find((x) => x.value === '论坛高层')?.count).toBe(1)
    expect(facets.keywords.find((x) => x.value === '论坛高层论坛')?.count).toBe(1)
  })

  it('should keep distinct keyword rows separate even when they look similar across the pool', () => {
    const now = Date.now()
    const base = {
      title: 'T',
      link: 'https://ex.test/k',
      publishedAt: new Date(now).toISOString(),
      summary: null,
      sourceId: 'src-a',
      sourceLabel: 'A',
      category: 'general-news' as const,
      region: 'cn' as const,
    }
    const pool: AggregatedNewsItem[] = [
      { ...base, link: 'https://ex.test/1', feedKeywords: ['霍尔海峡'] },
      { ...base, link: 'https://ex.test/2', feedKeywords: ['霍尔木霍尔木兹海峡'] },
    ]
    const facets = buildFeedFacetsFromPool(pool)
    expect(facets.keywords.map((x) => x.value).sort()).toEqual(['霍尔海峡', '霍尔木霍尔木兹海峡'].sort())
    expect(facets.keywords.find((x) => x.value === '霍尔海峡')?.count).toBe(1)
    expect(facets.keywords.find((x) => x.value === '霍尔木霍尔木兹海峡')?.count).toBe(1)
  })

  it('should count a topic at most once per article when it appears in both category and keyword', () => {
    const now = Date.now()
    const base = {
      title: 'T',
      link: 'https://ex.test/k',
      publishedAt: new Date(now).toISOString(),
      summary: null,
      sourceId: 'src-a',
      sourceLabel: 'A',
      category: 'general-news' as const,
      region: 'cn' as const,
    }
    const pool: AggregatedNewsItem[] = [
      {
        ...base,
        link: 'https://ex.test/dup-topic',
        feedCategories: ['春日经济'],
        feedKeywords: ['春日经济'],
      },
    ]
    const facets = buildFeedFacetsFromPool(pool)
    const row = facets.keywords.find((x) => x.value === '春日经济')
    expect(row?.count).toBe(1)
  })
})

describe('itemMatchesFacetListFilter exact topic match', () => {
  const base: AggregatedNewsItem = {
    title: 'T',
    link: 'https://ex.test/m',
    publishedAt: '2020-01-01T00:00:00.000Z',
    summary: null,
    sourceId: 's',
    sourceLabel: 'L',
    category: 'general-news',
    region: 'cn',
  }

  it('should not match feedKeyword when item only has a shorter substring of the selected facet', () => {
    const item = { ...base, feedKeywords: ['论坛高层'] }
    expect(itemMatchesFacetListFilter(item, { kind: 'fk', value: '论坛高层论坛' })).toBe(false)
  })

  it('should not match when item has a longer label and filter is shorter', () => {
    const item = { ...base, feedKeywords: ['论坛高层论坛'] }
    expect(itemMatchesFacetListFilter(item, { kind: 'fk', value: '论坛高层' })).toBe(false)
  })

  it('should not match feedKeyword when item and filter differ only by CJK token order', () => {
    const item = { ...base, feedKeywords: ['高层论坛'] }
    expect(itemMatchesFacetListFilter(item, { kind: 'fk', value: '论坛高层' })).toBe(false)
  })

  it('should not match feedKeyword when item and filter differ by one Latin typo', () => {
    const item = { ...base, feedKeywords: ['bitcion'] }
    expect(itemMatchesFacetListFilter(item, { kind: 'fk', value: 'bitcoin' })).toBe(false)
  })

  it('should not match very short substrings', () => {
    const item = { ...base, feedKeywords: ['美国'] }
    expect(itemMatchesFacetListFilter(item, { kind: 'fk', value: '美' })).toBe(false)
  })

  it('should match feedKeyword filter when the topic only appears in feedCategories', () => {
    const item = { ...base, feedCategories: ['宏观经济'], feedKeywords: [] }
    expect(itemMatchesFacetListFilter(item, { kind: 'fk', value: '宏观经济' })).toBe(true)
  })
})
