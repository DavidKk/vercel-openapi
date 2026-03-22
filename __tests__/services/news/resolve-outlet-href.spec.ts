import { resolveOutletHref } from '@/services/news/sources/resolve-outlet-href'
import type { NewsSourceConfig } from '@/services/news/types'

describe('resolveOutletHref', () => {
  const cfg: NewsSourceConfig = {
    id: 'x',
    label: 'X',
    category: 'general-news',
    subcategory: 'headlines',
    region: 'cn',
    rsshubPath: '/x',
    defaultUrl: 'https://example.com',
  }

  it('should prefer a valid http(s) item link', () => {
    expect(resolveOutletHref('https://news.test/article', cfg)).toBe('https://news.test/article')
  })

  it('should fall back to manifest defaultUrl when item link is empty', () => {
    expect(resolveOutletHref('', cfg)).toBe('https://example.com')
  })

  it('should fall back when item link is not http(s)', () => {
    expect(resolveOutletHref('javascript:alert(1)', cfg)).toBe('https://example.com')
  })

  it('should return empty when neither side is usable', () => {
    expect(resolveOutletHref('', { ...cfg, defaultUrl: undefined })).toBe('')
  })
})
