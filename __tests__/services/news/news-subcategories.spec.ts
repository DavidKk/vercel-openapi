import {
  getDefaultNewsSubcategory,
  getNewsListLabelEn,
  getNewsSubcategoryLabel,
  getNewsSubcategorySlugsForCategory,
  isValidNewsSubcategoryForCategory,
  normalizeNewsSubcategory,
} from '@/services/news/config/news-subcategories'

describe('news-subcategories', () => {
  it('should default tech-internet to media slug', () => {
    expect(getDefaultNewsSubcategory('tech-internet')).toBe('media')
  })

  it('should normalize invalid sub to default', () => {
    expect(normalizeNewsSubcategory('tech-internet', 'nope')).toBe('media')
    expect(normalizeNewsSubcategory('tech-internet', null)).toBe('media')
  })

  it('should accept valid sub for category', () => {
    expect(isValidNewsSubcategoryForCategory('tech-internet', 'developer')).toBe(true)
    expect(isValidNewsSubcategoryForCategory('tech-internet', 'bad')).toBe(false)
  })

  it('should list slugs per category', () => {
    expect(getNewsSubcategorySlugsForCategory('game-entertainment')).toEqual(['games'])
  })

  it('should return label or slug fallback', () => {
    expect(getNewsSubcategoryLabel('tech-internet', 'developer')).toBe('开发社区')
  })

  it('should return English list label for channel picker', () => {
    expect(getNewsListLabelEn('headlines')).toBe('Headlines')
    expect(getNewsListLabelEn('media')).toBe('Tech media')
  })
})
