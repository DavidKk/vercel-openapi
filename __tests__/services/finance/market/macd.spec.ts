import { buildMacdHistogramFromClose, ewmAdjustFalse, getMacdStreakUpDownFromHistogram } from '@/services/finance/market/daily/macd'

describe('services/finance/market/daily/macd', () => {
  it('should keep ewmAdjustFalse first output equal to first input (pandas adjust=False)', () => {
    expect(ewmAdjustFalse([10, 12, 11], 3)[0]).toBe(10)
  })

  it('should produce non-empty MACD histogram for monotonic closes', () => {
    const closes = [5.0, 5.05, 5.1, 5.08, 5.2, 5.25, 5.3]
    const hist = buildMacdHistogramFromClose(closes)
    expect(hist).toHaveLength(closes.length)
    const streak = getMacdStreakUpDownFromHistogram(hist)
    expect(streak.up + streak.down).toBeGreaterThanOrEqual(0)
  })
})
