import { buildFinalFeedKeywordsForNewsItem } from '@/services/news/facets/finalize-news-item-topic-keywords'

describe('buildFinalFeedKeywordsForNewsItem', () => {
  it('should keep RSS keyword when it appears literally in title or summary', () => {
    const item = {
      title: '美国欲驱逐伊朗外交官',
      link: 'https://ex.test/1',
      publishedAt: '2020-01-01T00:00:00.000Z',
      summary: '美国欲驱逐伊朗外交官引发关注',
      sourceId: 's',
      sourceLabel: 'L',
      category: 'general-news' as const,
      region: 'cn' as const,
      feedKeywords: ['驱逐伊朗'],
    }
    const kws = buildFinalFeedKeywordsForNewsItem(item)
    expect(kws).toContain('驱逐伊朗')
  })

  it('should hard-drop obvious time, reporting, action, and residue phrases', () => {
    const summary = '今天；近日；新华社报；李强出席；第三十四届；活动；安全；官方；伊朗；霍尔木兹海峡；人工智能'
    const item = {
      title: summary,
      link: 'https://ex.test/2',
      publishedAt: '2020-01-01T00:00:00.000Z',
      summary,
      sourceId: 's',
      sourceLabel: 'L',
      category: 'general-news' as const,
      region: 'cn' as const,
      feedKeywords: ['今天', '近日', '新华社报', '李强出席', '第三十四届', '活动', '安全', '官方', '伊朗', '霍尔木兹海峡', '人工智能'],
    }
    const kws = buildFinalFeedKeywordsForNewsItem(item)
    expect(kws).toEqual(expect.arrayContaining(['伊朗', '霍尔木兹海峡']))
    expect(kws).not.toEqual(expect.arrayContaining(['今天', '近日', '新华社报', '李强出席', '第三十四届', '活动', '安全', '官方']))
  })

  it('should drop phrases that extend from a banned time/reporting head', () => {
    const summary = '今天表示；今年恰逢；伊朗；人工智能'
    const item = {
      title: summary,
      link: 'https://ex.test/3',
      publishedAt: '2020-01-01T00:00:00.000Z',
      summary,
      sourceId: 's',
      sourceLabel: 'L',
      category: 'general-news' as const,
      region: 'cn' as const,
      feedKeywords: ['今天表示', '今年恰逢', '伊朗', '人工智能'],
    }
    const kws = buildFinalFeedKeywordsForNewsItem(item)
    expect(kws).toEqual(expect.arrayContaining(['伊朗']))
    expect(kws).not.toEqual(expect.arrayContaining(['今天表示', '今年恰逢']))
  })

  it('should return empty when RSS omits keywords', () => {
    const item = {
      title: 'Some headline without media keywords',
      link: 'https://ex.test/4',
      publishedAt: '2020-01-01T00:00:00.000Z',
      summary: null,
      sourceId: 's',
      sourceLabel: 'L',
      category: 'general-news' as const,
      region: 'cn' as const,
    }
    expect(buildFinalFeedKeywordsForNewsItem(item)).toEqual([])
  })
})
