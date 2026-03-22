import { normalizeTitleKey } from '@/services/news/parsing/normalize-title'

describe('normalizeTitleKey', () => {
  it('should collapse whitespace and strip simple tags', () => {
    expect(normalizeTitleKey('  a  <b>b</b>  ')).toBe('a b')
  })

  it('should decode common entities', () => {
    expect(normalizeTitleKey('A &amp; B')).toBe('A & B')
  })

  it('should return empty for blank input', () => {
    expect(normalizeTitleKey('')).toBe('')
    expect(normalizeTitleKey('   ')).toBe('')
  })

  it('should strip trailing Chinese or ASCII sentence punctuation', () => {
    expect(normalizeTitleKey('闽江学院更名为闽江大学。')).toBe('闽江学院更名为闽江大学')
  })
})
