import {
  buildNewsFacetQueryParams,
  buildNewsOverviewHref,
  isNewsManifestCategoryFeedPath,
  newsOverviewTagFiltersEqual,
  parseNewsFacetFromUrlSearchParams,
  parseNewsOverviewCategoryParam,
  parseNewsOverviewQueryParam,
  resolveNewsFeedLandingHrefFromRootSearch,
  serializeNewsOverviewQueryParam,
} from '@/services/news/news-overview-url'

describe('news-overview-url', () => {
  it('should default category to general-news when missing or invalid', () => {
    expect(parseNewsOverviewCategoryParam(null)).toBe('general-news')
    expect(parseNewsOverviewCategoryParam('')).toBe('general-news')
    expect(parseNewsOverviewCategoryParam('nope')).toBe('general-news')
    expect(parseNewsOverviewCategoryParam('tech-internet')).toBe('tech-internet')
  })

  it('should parse legacy query as kind,rest (value may contain commas)', () => {
    expect(parseNewsOverviewQueryParam(null)).toBe(null)
    expect(parseNewsOverviewQueryParam('fc,中国政库')).toEqual({ kind: 'fc', value: '中国政库' })
    expect(parseNewsOverviewQueryParam('fk,a,b,c')).toEqual({ kind: 'fk', value: 'a,b,c' })
    expect(parseNewsOverviewQueryParam('src,thepaper-featured')).toEqual({
      kind: 'src',
      sourceId: 'thepaper-featured',
    })
    expect(parseNewsOverviewQueryParam('bad,x')).toBe(null)
  })

  it('should round-trip legacy facet through serialize and parse', () => {
    const f = { kind: 'fc' as const, value: '时政,滚动' }
    expect(parseNewsOverviewQueryParam(serializeNewsOverviewQueryParam(f))).toEqual(f)
  })

  it('should parse modern facet params with precedence source > tag > keyword', () => {
    const p = new URLSearchParams('tag=a&keyword=b&source=src-id')
    expect(parseNewsFacetFromUrlSearchParams(p)).toEqual({ kind: 'src', sourceId: 'src-id' })
    const p2 = new URLSearchParams('tag=a&keyword=b')
    expect(parseNewsFacetFromUrlSearchParams(p2)).toEqual({ kind: 'fc', value: 'a' })
    const p3 = new URLSearchParams('keyword=kw')
    expect(parseNewsFacetFromUrlSearchParams(p3)).toEqual({ kind: 'fk', value: 'kw' })
  })

  it('should build href for category path only', () => {
    expect(buildNewsOverviewHref('general-news', null)).toBe('/news/general-news')
    expect(buildNewsOverviewHref('tech-internet', null)).toBe('/news/tech-internet')
  })

  it('should build href with tag keyword source query', () => {
    expect(buildNewsOverviewHref('general-news', { kind: 'fc', value: '国内' })).toBe('/news/general-news?tag=%E5%9B%BD%E5%86%85')
    expect(buildNewsOverviewHref('tech-internet', { kind: 'fk', value: 'a,b' })).toContain('keyword=')
    const h = buildNewsOverviewHref('general-news', { kind: 'src', sourceId: 'x' })
    expect(h).toBe('/news/general-news?source=x')
  })

  it('should build facet query params without category', () => {
    expect(buildNewsFacetQueryParams(null).toString()).toBe('')
    expect(buildNewsFacetQueryParams({ kind: 'fc', value: 'z' }).get('tag')).toBe('z')
    expect(buildNewsFacetQueryParams({ kind: 'fk', value: 'z' }).get('keyword')).toBe('z')
    expect(buildNewsFacetQueryParams({ kind: 'src', sourceId: 'ab-c' }).get('source')).toBe('ab-c')
  })

  it('should resolve root /news legacy search to new path', () => {
    expect(resolveNewsFeedLandingHrefFromRootSearch({})).toBe('/news/general-news')
    expect(resolveNewsFeedLandingHrefFromRootSearch({ category: 'tech-internet' })).toBe('/news/tech-internet')
    expect(resolveNewsFeedLandingHrefFromRootSearch({ query: 'fc,国内' })).toBe('/news/general-news?tag=%E5%9B%BD%E5%86%85')
    expect(resolveNewsFeedLandingHrefFromRootSearch({ category: 'tech-internet', query: 'fk,a,b' })).toContain('/news/tech-internet')
    expect(resolveNewsFeedLandingHrefFromRootSearch({ category: 'tech-internet', query: 'fk,a,b' })).toContain('keyword=a%2Cb')
  })

  it('should resolve root /news modern search params', () => {
    expect(resolveNewsFeedLandingHrefFromRootSearch({ tag: '时政' })).toContain('tag=')
    expect(resolveNewsFeedLandingHrefFromRootSearch({ source: 'thepaper-featured' })).toBe('/news/general-news?source=thepaper-featured')
  })

  it('should detect manifest category feed pathname', () => {
    expect(isNewsManifestCategoryFeedPath('/news/general-news')).toBe(true)
    expect(isNewsManifestCategoryFeedPath('/news/tech-internet')).toBe(true)
    expect(isNewsManifestCategoryFeedPath('/news/api')).toBe(false)
    expect(isNewsManifestCategoryFeedPath('/news')).toBe(false)
  })

  it('should compare tag filters', () => {
    expect(newsOverviewTagFiltersEqual(null, null)).toBe(true)
    expect(newsOverviewTagFiltersEqual({ kind: 'fc', value: 'a' }, { kind: 'fc', value: 'a' })).toBe(true)
    expect(newsOverviewTagFiltersEqual({ kind: 'fc', value: 'a' }, { kind: 'fc', value: 'b' })).toBe(false)
  })
})
