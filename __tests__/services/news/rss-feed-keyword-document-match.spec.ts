import { buildPlainDocumentForKeywordCheck, filterFeedKeywordsLiteralInPlain, stripHtmlSummaryToPlain } from '@/services/news/facets/rss-feed-keyword-document-match'

describe('rss-feed-keyword-document-match', () => {
  it('should strip HTML from summary for plain matching', () => {
    expect(stripHtmlSummaryToPlain('<p>霍尔木兹海峡</p>')).toBe('霍尔木兹海峡')
  })

  it('should drop bogus upstream bigrams not literal in title or summary', () => {
    const title = '伊朗称允许非"敌方"船只通过霍尔木兹海峡'
    const summary = '<p>据伊朗方面22日消息，伊朗驻国际海事组织代表表示，伊朗允许非"敌方"船只通过霍尔木兹海峡，但需与伊朗就安全问题进行协调并作出相关安排。</p>'
    const plain = buildPlainDocumentForKeywordCheck(title, summary)
    const raw = ['海峡霍尔木', '霍尔木霍尔木兹海峡', '敌方船只', '船只霍尔', '霍尔木兹海峡']
    const out = filterFeedKeywordsLiteralInPlain(raw, plain)
    expect(out).not.toContain('海峡霍尔木')
    expect(out).not.toContain('霍尔木霍尔木兹海峡')
    expect(out).not.toContain('船只霍尔')
    expect(out).toContain('霍尔木兹海峡')
  })

  it('should keep short tokens without literal check', () => {
    const plain = '霍尔木兹 新闻'
    expect(filterFeedKeywordsLiteralInPlain(['美国', 'AI', '中东'], plain)).toEqual(['美国', 'AI', '中东'])
  })
})
