/**
 * MACD helpers aligned with the legacy service CSV export:
 *
 * 1. **EMA12** — close series with the first output seeded by the first close
 * 2. **EMA26** — close series with the first output seeded by the first close
 * 3. **DIF** — `EMA12 - EMA26`
 * 4. **DEA** — EMA(9) of DIF, seeded by the first DIF
 * 5. **MACD** (histogram) — `(DIF - DEA) * 2`
 *
 * Range routes compute this over the returned window by default, so the first row in a requested
 * window has `EMA12 = EMA26 = close` and `DIF = DEA = MACD = 0`, matching `macd_data.csv`.
 *
 * Core recurrence uses **decimal.js** (base-10) so long EMA chains avoid IEEE-754 drift vs repeated native float ops.
 */

import Decimal from 'decimal.js'

/** Decimal precision for EMA / MACD intermediates. */
const DECIMAL_PRECISION = 40

Decimal.set({
  precision: DECIMAL_PRECISION,
  rounding: Decimal.ROUND_HALF_UP,
})

/**
 * Best-effort Decimal from a JS number using its shortest decimal string (stable chain vs raw IEEE ops).
 *
 * @param value Finite close or intermediate already represented as number
 * @returns Decimal instance for recurrence
 */
function toDecimal(value: number): Decimal {
  return new Decimal(value.toString())
}

/**
 * Exponential moving average with legacy cold-start semantics:
 * `ema[0] = values[0]`, then `ema[i] = (values[i] - ema[i - 1]) * 2/(period + 1) + ema[i - 1]`.
 *
 * @param values Input series as Decimals
 * @param period EMA period
 * @returns Smoothed series of same length
 */
function emaColdStartDecimals(values: Decimal[], period: number): Decimal[] {
  if (values.length === 0) return []
  const multiplier = new Decimal(2).dividedBy(period + 1)
  const out: Decimal[] = []
  let current = values[0]
  out.push(current)
  for (let i = 1; i < values.length; i += 1) {
    current = values[i].minus(current).times(multiplier).plus(current)
    out.push(current)
  }
  return out
}

/**
 * EMA with first value seeded by the first input, matching the legacy MACD CSV export.
 *
 * @param values Input values
 * @param period EMA period
 * @returns Same-length EMA series
 */
export function emaColdStart(values: number[], period: number): number[] {
  return emaColdStartDecimals(values.map(toDecimal), period).map((value) => value.toNumber())
}

/**
 * Full MACD component series from closes.
 */
export interface MacdIndicatorSeries {
  /** **EMA12** — fast EMA of close, cold-started from first close */
  ema12: number[]
  /** **EMA26** — slow EMA of close, cold-started from first close */
  ema26: number[]
  /** **DIF** — EMA12 minus EMA26 */
  dif: number[]
  /** **DEA** — signal EMA of DIF, cold-started from first DIF */
  dea: number[]
  /** **MACD** histogram — (DIF minus DEA) times 2 */
  macd: number[]
}

/**
 * Compute **EMA12**, **EMA26**, **DIF**, **DEA**, and **MACD** per bar using legacy cold-start semantics.
 *
 * @param closes Close prices, chronological (oldest -> newest)
 * @returns Five aligned series (same length as `closes`)
 */
export function computeMacdSeriesFromClose(closes: number[]): MacdIndicatorSeries {
  if (closes.length === 0) {
    return { ema12: [], ema26: [], dif: [], dea: [], macd: [] }
  }

  const decCloses = closes.map(toDecimal)
  const ema12d = emaColdStartDecimals(decCloses, 12)
  const ema26d = emaColdStartDecimals(decCloses, 26)
  const difd = ema12d.map((ema12, i) => ema12.minus(ema26d[i]))
  const dead = emaColdStartDecimals(difd, 9)
  const macdd = difd.map((dif, i) => dif.minus(dead[i]).times(2))

  return {
    ema12: ema12d.map((value) => value.toNumber()),
    ema26: ema26d.map((value) => value.toNumber()),
    dif: difd.map((value) => value.toNumber()),
    dea: dead.map((value) => value.toNumber()),
    macd: macdd.map((value) => value.toNumber()),
  }
}

/**
 * Build MACD histogram (bar) series from closes.
 *
 * @param closes Close prices in chronological order (oldest -> newest)
 * @returns MACD bar per bar (same length as closes)
 */
export function buildMacdHistogramFromClose(closes: number[]): number[] {
  return computeMacdSeriesFromClose(closes).macd
}

/**
 * Count consecutive MACD bar increases from the end, then consecutive decreases.
 *
 * @param macdSeries MACD histogram values, oldest -> newest
 * @param endIndex Inclusive index to evaluate, defaults to the latest bar
 * @returns Streak counts (macdUp, macdDown) for the latest regime
 */
export function getMacdStreakUpDownFromHistogram(macdSeries: number[], endIndex = macdSeries.length - 1): { up: number; down: number } {
  let i = Math.min(endIndex, macdSeries.length - 1)
  while (i >= 1 && (!Number.isFinite(macdSeries[i]) || !Number.isFinite(macdSeries[i - 1]))) {
    i -= 1
  }
  if (i < 1) {
    return { up: 0, down: 0 }
  }

  let isRise = true
  let up = 0
  let down = 0
  for (; i >= 1; i -= 1) {
    if (!Number.isFinite(macdSeries[i]) || !Number.isFinite(macdSeries[i - 1])) {
      break
    }
    if (isRise) {
      if (macdSeries[i] > macdSeries[i - 1]) {
        up += 1
      } else {
        isRise = false
        down += 1
      }
    } else if (macdSeries[i] < macdSeries[i - 1]) {
      down += 1
    } else {
      break
    }
  }
  return { up, down }
}
