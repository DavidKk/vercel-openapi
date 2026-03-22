import { normalizeLink } from '@/services/news/parsing/normalize-link'

describe('normalizeLink', () => {
  it('should strip utm params and trailing slash on path', () => {
    const u = normalizeLink('https://ExAmple.com/foo/?utm_campaign=1&x=1')
    expect(u.startsWith('https://example.com/foo')).toBe(true)
    expect(u).not.toContain('utm_')
    expect(u).toContain('x=1')
  })

  it('should return lowercased raw when URL invalid', () => {
    expect(normalizeLink('  not-a-url  ')).toBe('not-a-url')
  })
})
