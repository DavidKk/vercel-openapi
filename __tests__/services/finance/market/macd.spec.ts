import { buildMacdHistogramFromClose, computeMacdSeriesFromClose, ewmAdjustFalse, getMacdStreakUpDownFromHistogram } from '@/services/finance/market/daily/macd'

describe('services/finance/market/daily/macd', () => {
  /**
   * Golden slice from `macd_data.csv` (收盘 + precomputed EMA/DIF/DEA/MACD), oldest → newest.
   * Verifies pandas `ewm(span, adjust=False)` MACD matches offline export within floating tolerance.
   */
  it('should match macd_data.csv golden slice', () => {
    const closes = [
      4.090997661730319, 4.116328916601715, 4.094894777864381, 4.105611847233048, 4.126071706936867, 4.123148869836322, 4.048129384255651, 4.026695245518317, 4.0452065471551055,
      4.075409197194077, 4.086126266562744, 4.085151987529228,
    ]
    const golden = [
      { ema12: 4.090997661730319, ema26: 4.090997661730319, dif: 0, dea: 0, macd: 0 },
      { ema12: 4.09489477786438, ema26: 4.092874050980052, dif: 0.0020207268843277504, dea: 0.0004041453768655501, macd: 0.0032331630149244005 },
      { ema12: 4.09489477786438, ema26: 4.093023734452966, dif: 0.0018710434114144192, dea: 0.0006975249837753239, macd: 0.0023470368552781905 },
      { ema12: 4.096543557767252, ema26: 4.09395618725149, dif: 0.0025873705157621885, dea: 0.0010754940901726968, macd: 0.0030237528511789834 },
      { ema12: 4.1010863499471935, ema26: 4.096335114635592, dif: 0.004751235311601043, dea: 0.001810642334458366, macd: 0.0058811859542853544 },
      { ema12: 4.10448058377629, ema26: 4.098321318724535, dif: 0.006159265051755014, dea: 0.002680366877917696, macd: 0.006957796347674636 },
      { ema12: 4.095811168465422, ema26: 4.094603397652766, dif: 0.001207770812656328, dea: 0.0023858476648654222, macd: -0.0023561537044181884 },
      { ema12: 4.085177949550483, ema26: 4.089573164161325, dif: -0.004395214610841691, dea: 0.0010296352097239996, macd: -0.010849699641131381 },
      { ema12: 4.079028503028118, ema26: 4.08628674808679, dif: -0.00725824505867223, dea: -0.0006279408439552464, macd: -0.013260608429433968 },
      { ema12: 4.078471686745958, ema26: 4.085481003576219, dif: -0.007009316830260737, dea: -0.0019042160412163448, macd: -0.010210201578088784 },
      { ema12: 4.079649314410079, ema26: 4.08552880083448, dif: -0.005879486424400504, dea: -0.002699270117853177, macd: -0.006360432613094654 },
      { ema12: 4.080495879505333, ema26: 4.085500888737794, dif: -0.005005009232460722, dea: -0.003160417940774686, macd: -0.003689182583372072 },
    ]

    const s = computeMacdSeriesFromClose(closes)
    expect(s.ema12).toHaveLength(closes.length)

    const digits = 12
    for (let i = 0; i < golden.length; i += 1) {
      const g = golden[i]
      expect(s.ema12[i]).toBeCloseTo(g.ema12, digits)
      expect(s.ema26[i]).toBeCloseTo(g.ema26, digits)
      expect(s.dif[i]).toBeCloseTo(g.dif, digits)
      expect(s.dea[i]).toBeCloseTo(g.dea, digits)
      expect(s.macd[i]).toBeCloseTo(g.macd, digits)
    }
  })

  it('should keep ewmAdjustFalse first output equal to first input (pandas adjust=False)', () => {
    expect(ewmAdjustFalse([10, 12, 11], 3)[0]).toBe(10)
  })

  it('should expose finite MACD histogram from first bar (pandas EWM)', () => {
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
