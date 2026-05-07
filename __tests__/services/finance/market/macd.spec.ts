import { buildMacdHistogramFromClose, computeMacdSeriesFromClose, emaColdStart, getMacdStreakUpDownFromHistogram } from '@/services/finance/market/daily/macd'

import { buildClosesFrom510300ForMacdExpected, load510300OhlcvFixture, loadMacdExpectedFixture, parse510300CloseByDate, parseMacdExpectedRows } from './macdCsvFixtures'

describe('services/finance/market/daily/macd', () => {
  it('should seed EMA with the first close, matching the legacy CSV export', () => {
    expect(emaColdStart([10, 12, 11], 3)[0]).toBe(10)
  })

  /**
   * Integration-style regression:
   * - Input closes: `__tests__/fixtures/finance/market/510300-ohlcv.csv` (`收盘` per date).
   * - Expected EMA / MACD: `__tests__/fixtures/finance/market/macd-data-expected.csv` (legacy service export).
   *
   * Rows are aligned by `日期`. The legacy MACD file is a requested-window calculation whose first row cold-starts EMA;
   * we therefore compute MACD only on that ordered close sequence from 510300, without historical warmup.
   */
  it('should match macd-data-expected.csv using closes from 510300-ohlcv.csv', () => {
    const closeByDate = parse510300CloseByDate(load510300OhlcvFixture())
    const expectedRows = parseMacdExpectedRows(loadMacdExpectedFixture())
    expect(expectedRows.length).toBeGreaterThan(0)

    const closes = buildClosesFrom510300ForMacdExpected(closeByDate, expectedRows)

    const digits = 12
    for (let i = 0; i < expectedRows.length; i += 1) {
      expect(closes[i]).toBeCloseTo(expectedRows[i].closeFromMacdCsv, digits)
    }

    const s = computeMacdSeriesFromClose(closes)
    expect(s.ema12).toHaveLength(closes.length)

    for (let i = 0; i < expectedRows.length; i += 1) {
      const g = expectedRows[i]
      expect(s.ema12[i]).toBeCloseTo(g.ema12, digits)
      expect(s.ema26[i]).toBeCloseTo(g.ema26, digits)
      expect(s.dif[i]).toBeCloseTo(g.dif, digits)
      expect(s.dea[i]).toBeCloseTo(g.dea, digits)
      expect(s.macd[i]).toBeCloseTo(g.macd, digits)
    }
  })

  it('should expose finite MACD histogram from first bar', () => {
    const closes = Array.from({ length: 40 }, (_, i) => 100 + i * 0.05)
    const hist = buildMacdHistogramFromClose(closes)
    expect(hist).toHaveLength(closes.length)
    expect(Number.isFinite(hist[0])).toBe(true)
    expect(Number.isFinite(hist[39])).toBe(true)
    const s = computeMacdSeriesFromClose(closes)
    expect(s.macd[0]).toBeCloseTo((s.dif[0] - s.dea[0]) * 2, 10)
  })

  it('should produce histogram length matching closes and streak sums non-negative', () => {
    const closes = [
      5.0, 5.05, 5.1, 5.08, 5.2, 5.25, 5.3, 5.28, 5.31, 5.33, 5.35, 5.36, 5.38, 5.4, 5.42, 5.44, 5.46, 5.48, 5.5, 5.52, 5.54, 5.56, 5.58, 5.6, 5.62, 5.64, 5.66, 5.68, 5.7, 5.72,
      5.74, 5.76, 5.78, 5.8, 5.82,
    ]
    const hist = buildMacdHistogramFromClose(closes)
    expect(hist).toHaveLength(closes.length)
    const streak = getMacdStreakUpDownFromHistogram(hist)
    expect(streak.up + streak.down).toBeGreaterThanOrEqual(0)
  })
})
