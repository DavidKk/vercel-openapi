import { aggregateTopTagsFromTitles } from '@/services/text-keywords/aggregate-top-tags'
import { extractKeywordTokensFromText } from '@/services/text-keywords/extract-keyword-tokens'
import { inferPrimaryKeywordLocale } from '@/services/text-keywords/infer-primary-locale'

describe('text-keywords / inferPrimaryKeywordLocale', () => {
  it('should classify primarily Chinese headlines as zh', () => {
    expect(inferPrimaryKeywordLocale('人工智能推动产业升级')).toBe('zh')
  })

  it('should classify primarily English headlines as en', () => {
    expect(inferPrimaryKeywordLocale('Federal Reserve holds rates steady')).toBe('en')
  })

  it('should treat empty or punctuation-only text as en', () => {
    expect(inferPrimaryKeywordLocale('')).toBe('en')
    expect(inferPrimaryKeywordLocale('   ')).toBe('en')
    expect(inferPrimaryKeywordLocale('…')).toBe('en')
  })
})

describe('text-keywords / extractKeywordTokensFromText', () => {
  it('should extract Chinese content tokens with jieba', () => {
    const tokens = extractKeywordTokensFromText('人工智能与足球产业发展')
    expect(tokens).toContain('足球')
    expect(tokens).toContain('人工智能')
  })

  it('should extract English noun phrases with compromise', () => {
    const tokens = extractKeywordTokensFromText('The Federal Reserve raised interest rates sharply')
    expect(tokens.some((t) => t.includes('federal') || t.includes('reserve'))).toBe(true)
    expect(tokens.some((t) => t.includes('interest') || t.includes('rate'))).toBe(true)
  })

  it('should return an empty array for blank input', () => {
    expect(extractKeywordTokensFromText('')).toEqual([])
  })
})

describe('text-keywords / aggregateTopTagsFromTitles', () => {
  it('should rank tags by document frequency across titles', () => {
    const titles = ['Apple reports profit', 'Apple cuts prices', 'Microsoft vs Apple']
    const tags = aggregateTopTagsFromTitles(titles, { topK: 10, minDocCount: 2 })
    const apple = tags.find((t) => t.tag === 'apple')
    expect(apple?.docCount).toBe(3)
  })

  it('should respect minDocCount', () => {
    const titles = ['Unique headline alpha', 'Unique headline beta']
    const strict = aggregateTopTagsFromTitles(titles, { minDocCount: 2, topK: 5 })
    const loose = aggregateTopTagsFromTitles(titles, { minDocCount: 1, topK: 5 })
    expect(strict).toEqual([])
    expect(loose.length).toBeGreaterThanOrEqual(2)
  })
})
