import { stripRedundantCategoryLikeLabelsFromAggregatedItem, stripRedundantCategoryLikeTopicLabels } from '@/services/news/facets/strip-redundant-topic-category-labels'
import type { AggregatedNewsItem } from '@/services/news/types'

describe('stripRedundantCategoryLikeTopicLabels', () => {
  it('should drop exact taxonomy labels in SC and TC', () => {
    expect(stripRedundantCategoryLikeTopicLabels(['科技', '航天', '新聞', '月球'])).toEqual(['航天', '月球'])
  })

  it('should keep specific topics that are not exact matches', () => {
    expect(stripRedundantCategoryLikeTopicLabels(['科技新闻', '人工智能', '游戏产业'])).toEqual(['科技新闻', '人工智能', '游戏产业'])
  })

  it('should drop English channel labels case-insensitively for ASCII', () => {
    expect(stripRedundantCategoryLikeTopicLabels(['SCIENCE', 'Mars', 'tech media'])).toEqual(['Mars'])
  })

  it('should drop listed taxonomy terms when passed alone', () => {
    expect(stripRedundantCategoryLikeTopicLabels(['要闻'])).toEqual([])
    expect(stripRedundantCategoryLikeTopicLabels(['  开发  '])).toEqual([])
    expect(stripRedundantCategoryLikeTopicLabels(['量子计算'])).toEqual(['量子计算'])
  })
})

describe('stripRedundantCategoryLikeLabelsFromAggregatedItem', () => {
  it('should strip both feedKeywords and feedCategories in place', () => {
    const item: AggregatedNewsItem = {
      title: 't',
      link: 'https://ex.test/a',
      publishedAt: null,
      summary: null,
      sourceId: 'x',
      sourceLabel: 'X',
      category: 'general-news',
      region: 'cn',
      feedKeywords: ['科学', '台风'],
      feedCategories: ['资讯', '社会'],
    }
    stripRedundantCategoryLikeLabelsFromAggregatedItem(item)
    expect(item.feedKeywords).toEqual(['台风'])
    expect(item.feedCategories).toEqual(['社会'])
  })

  it('should delete empty facet arrays after strip', () => {
    const item: AggregatedNewsItem = {
      title: 't',
      link: 'https://ex.test/b',
      publishedAt: null,
      summary: null,
      sourceId: 'x',
      sourceLabel: 'X',
      category: 'tech-internet',
      region: 'cn',
      feedKeywords: ['游戏'],
    }
    stripRedundantCategoryLikeLabelsFromAggregatedItem(item)
    expect(item.feedKeywords).toBeUndefined()
  })
})
