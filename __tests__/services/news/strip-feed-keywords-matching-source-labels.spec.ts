import {
  normalizeLabelForOutletMatch,
  stripAggregatedItemRssAnnotationsAgainstOutletNames,
  stripFeedCategoriesMatchingOutletNames,
  stripFeedKeywordsMatchingSourceLabels,
} from '@/services/news/facets/strip-feed-keywords-matching-source-labels'
import type { AggregatedNewsItem } from '@/services/news/types'

describe('stripFeedKeywordsMatchingSourceLabels', () => {
  const labels = new Set(['澎湃评论', '澎湃新闻'])

  it('should drop keywords that equal a manifest source label', () => {
    expect(stripFeedKeywordsMatchingSourceLabels(['澎湃评论', '医疗'], '澎湃新闻', labels)).toEqual(['医疗'])
  })

  it('should drop keywords that equal the item primary source label', () => {
    expect(stripFeedKeywordsMatchingSourceLabels(['本地号', '界面新闻'], '界面新闻', new Set(['澎湃新闻']))).toEqual(['本地号'])
  })

  it('should trim and skip empty fragments', () => {
    expect(stripFeedKeywordsMatchingSourceLabels(['  医疗  ', '', '  '], 'A', new Set())).toEqual(['医疗'])
  })

  it('should return empty when all keywords are outlet labels', () => {
    expect(stripFeedKeywordsMatchingSourceLabels(['澎湃评论'], '央视', labels)).toEqual([])
  })

  it('should match manifest labels after NFKC normalize', () => {
    expect(stripFeedKeywordsMatchingSourceLabels(['ＢＢＣ', 'k'], 'x', new Set(['BBC']))).toEqual(['k'])
    expect(normalizeLabelForOutletMatch('ＢＢＣ')).toBe('bbc')
  })

  it('should match ASCII labels case-insensitively', () => {
    expect(stripFeedKeywordsMatchingSourceLabels(['BBC News', 'x'], 'cnn', new Set(['BBC News']))).toEqual(['x'])
    expect(stripFeedKeywordsMatchingSourceLabels(['bbc news'], 'cnn', new Set(['BBC News']))).toEqual([])
  })
})

describe('stripFeedCategoriesMatchingOutletNames', () => {
  const labels = new Set(['澎湃评论', '澎湃新闻'])

  it('should drop categories that duplicate the primary source or another outlet', () => {
    expect(stripFeedCategoriesMatchingOutletNames(['澎湃评论', '社论'], '澎湃评论', labels)).toEqual(['社论'])
    expect(stripFeedCategoriesMatchingOutletNames(['澎湃评论', '国际'], '澎湃新闻', labels)).toEqual(['国际'])
  })
})

describe('stripAggregatedItemRssAnnotationsAgainstOutletNames', () => {
  it('should remove keywords matching merged outlet labels', () => {
    const labels = new Set(['澎湃评论', '澎湃新闻', '央视'])
    const item: AggregatedNewsItem = {
      title: 'T',
      link: 'https://ex.test/a',
      publishedAt: '2020-01-01T00:00:00.000Z',
      summary: null,
      sourceId: 'x',
      sourceLabel: '澎湃新闻',
      category: 'general-news',
      region: 'cn',
      feedKeywords: ['澎湃评论', '医疗'],
      alsoFromSources: [],
    }
    stripAggregatedItemRssAnnotationsAgainstOutletNames(item, labels)
    expect(item.feedKeywords).toEqual(['医疗'])
  })
})
