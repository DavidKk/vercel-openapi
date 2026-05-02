import { parseWithIndicatorsLatestDefaultTrue } from '@/services/finance/market/daily/withIndicatorsQuery'

describe('parseWithIndicatorsLatestDefaultTrue', () => {
  it('should default to true when query is absent or empty', () => {
    expect(parseWithIndicatorsLatestDefaultTrue(null)).toBe(true)
    expect(parseWithIndicatorsLatestDefaultTrue('')).toBe(true)
  })

  it('should return false for explicit off tokens', () => {
    expect(parseWithIndicatorsLatestDefaultTrue('false')).toBe(false)
    expect(parseWithIndicatorsLatestDefaultTrue('FALSE')).toBe(false)
    expect(parseWithIndicatorsLatestDefaultTrue('0')).toBe(false)
    expect(parseWithIndicatorsLatestDefaultTrue('  false  ')).toBe(false)
    expect(parseWithIndicatorsLatestDefaultTrue('no')).toBe(false)
    expect(parseWithIndicatorsLatestDefaultTrue('NO')).toBe(false)
    expect(parseWithIndicatorsLatestDefaultTrue('off')).toBe(false)
    expect(parseWithIndicatorsLatestDefaultTrue('OFF')).toBe(false)
  })

  it('should return true for other non-empty values including true', () => {
    expect(parseWithIndicatorsLatestDefaultTrue('true')).toBe(true)
    expect(parseWithIndicatorsLatestDefaultTrue('yes')).toBe(true)
    expect(parseWithIndicatorsLatestDefaultTrue('1')).toBe(true)
  })
})
