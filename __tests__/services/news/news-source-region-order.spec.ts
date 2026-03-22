import { sortNewsItemSourceRefsByRegion } from '@/services/news/region/news-source-region-order'
import type { NewsItemSourceRef, NewsSourceConfig } from '@/services/news/types'

describe('news-source-region-order', () => {
  it('should sort also-from refs as cn → hk_tw → intl then label', () => {
    const refs: NewsItemSourceRef[] = [
      { sourceId: 'bbc', sourceLabel: 'BBC', href: 'https://bbc.com' },
      { sourceId: 'hk01', sourceLabel: 'HK01', href: 'https://hk01.com' },
      { sourceId: 'paper', sourceLabel: 'Paper', href: 'https://paper.cn' },
    ]
    const sourceById = new Map<string, Pick<NewsSourceConfig, 'region'>>([
      ['bbc', { region: 'intl' }],
      ['hk01', { region: 'hk_tw' }],
      ['paper', { region: 'cn' }],
    ])
    const out = sortNewsItemSourceRefsByRegion(refs, sourceById)
    expect(out.map((r) => r.sourceId)).toEqual(['paper', 'hk01', 'bbc'])
  })
})
