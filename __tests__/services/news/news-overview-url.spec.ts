import {
  buildNewsFacetQueryParams,
  buildNewsOverviewHref,
  isNewsListFeedPath,
  isNewsManifestCategoryFeedPath,
  newsOverviewTagFiltersEqual,
  parseNewsFacetFromUrlSearchParams,
  parseNewsOverviewCategoryParam,
  parseNewsOverviewQueryParam,
  resolveNewsFeedLandingHrefFromRootSearch,
  serializeNewsOverviewQueryParam,
} from '@/services/news/routing/news-overview-url'

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

  it('should build href for flat list path only', () => {
    expect(buildNewsOverviewHref('headlines', null)).toBe('/news/headlines')
    expect(buildNewsOverviewHref('media', null)).toBe('/news/media')
  })

  it('should build href with tag keyword source query', () => {
    expect(buildNewsOverviewHref('headlines', { kind: 'fc', value: '国内' })).toBe('/news/headlines?tag=%E5%9B%BD%E5%86%85')
    expect(buildNewsOverviewHref('media', { kind: 'fk', value: 'a,b' })).toContain('keyword=')
    const h = buildNewsOverviewHref('headlines', { kind: 'src', sourceId: 'x' })
    expect(h).toBe('/news/headlines?source=x')
  })

  it('should build facet query params without list path', () => {
    expect(buildNewsFacetQueryParams(null).toString()).toBe('')
    expect(buildNewsFacetQueryParams({ kind: 'fc', value: 'z' }).get('tag')).toBe('z')
    expect(buildNewsFacetQueryParams({ kind: 'fk', value: 'z' }).get('keyword')).toBe('z')
    expect(buildNewsFacetQueryParams({ kind: 'src', sourceId: 'ab-c' }).get('source')).toBe('ab-c')
  })

  it('should resolve root /news legacy search to flat list path', () => {
    expect(resolveNewsFeedLandingHrefFromRootSearch({})).toBe('/news/headlines')
    expect(resolveNewsFeedLandingHrefFromRootSearch({ category: 'tech-internet' })).toBe('/news/media')
    expect(resolveNewsFeedLandingHrefFromRootSearch({ query: 'fc,国内' })).toBe('/news/headlines?tag=%E5%9B%BD%E5%86%85')
    expect(resolveNewsFeedLandingHrefFromRootSearch({ category: 'tech-internet', query: 'fk,a,b' })).toContain('/news/media')
    expect(resolveNewsFeedLandingHrefFromRootSearch({ category: 'tech-internet', query: 'fk,a,b' })).toContain('keyword=a%2Cb')
  })

  it('should resolve root /news modern search params', () => {
    expect(resolveNewsFeedLandingHrefFromRootSearch({ tag: '时政' })).toContain('tag=')
    expect(resolveNewsFeedLandingHrefFromRootSearch({ source: 'thepaper-featured' })).toBe('/news/headlines?source=thepaper-featured')
  })

  it('should resolve explicit list query on /news root', () => {
    expect(resolveNewsFeedLandingHrefFromRootSearch({ list: 'games' })).toBe('/news/games')
  })

  it('should detect flat list feed pathname', () => {
    expect(isNewsListFeedPath('/news/headlines')).toBe(true)
    expect(isNewsListFeedPath('/news/media')).toBe(true)
    expect(isNewsManifestCategoryFeedPath('/news/headlines')).toBe(true)
    expect(isNewsListFeedPath('/news/general-news')).toBe(false)
    expect(isNewsListFeedPath('/news/api')).toBe(false)
    expect(isNewsListFeedPath('/news')).toBe(false)
  })

  it('should compare tag filters', () => {
    expect(newsOverviewTagFiltersEqual(null, null)).toBe(true)
    expect(newsOverviewTagFiltersEqual({ kind: 'fc', value: 'a' }, { kind: 'fc', value: 'a' })).toBe(true)
    expect(newsOverviewTagFiltersEqual({ kind: 'fc', value: 'a' }, { kind: 'fc', value: 'b' })).toBe(false)
  })
})
