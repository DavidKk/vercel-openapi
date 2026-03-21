import { decodeXmlEntities, parseRssItems } from '@/services/news/parse-rss'

describe('parseRssItems', () => {
  it('should parse two RSS items with title, link, pubDate', () => {
    const xml = `<?xml version="1.0"?>
<rss><channel>
<item>
<title><![CDATA[Hello & world]]></title>
<link>https://example.com/a?utm_source=x</link>
<pubDate>Mon, 21 Mar 2025 08:00:00 GMT</pubDate>
<description>Desc</description>
</item>
<item>
<title>Second</title>
<link>https://example.com/b</link>
</item>
</channel></rss>`
    const items = parseRssItems(xml)
    expect(items).toHaveLength(2)
    expect(items[0].title).toContain('Hello')
    expect(items[0].link).toContain('example.com/a')
    expect(items[0].publishedAt).toBeTruthy()
    expect(items[0].summary).toBe('Desc')
    expect(items[1].title).toBe('Second')
  })

  it('should return empty array when no items', () => {
    expect(parseRssItems('<rss><channel></channel></rss>')).toEqual([])
  })

  it('should parse multiple category and dc:subject into feedCategories', () => {
    const xml = `<?xml version="1.0"?>
<rss><channel><item>
<title>T</title>
<link>https://example.com/x</link>
<category>国内</category>
<category>社会</category>
<dc:subject xmlns:dc="http://purl.org/dc/elements/1.1/">民生</dc:subject>
</item></channel></rss>`
    const items = parseRssItems(xml)
    expect(items).toHaveLength(1)
    expect(items[0].feedCategories).toEqual(['国内', '社会', '民生'])
  })

  it('should parse media:keywords and split delimiters into feedKeywords', () => {
    const xml = `<?xml version="1.0"?>
<rss xmlns:media="http://search.yahoo.com/mrss/"><channel><item>
<title>K</title>
<link>https://example.com/k</link>
<media:keywords>a,b，c; d</media:keywords>
</item></channel></rss>`
    const items = parseRssItems(xml)
    expect(items[0].feedKeywords).toEqual(['a', 'b', 'c', 'd'])
  })
})

describe('decodeXmlEntities', () => {
  it('should decode basic entities', () => {
    expect(decodeXmlEntities('a &amp; b')).toBe('a & b')
  })
})
