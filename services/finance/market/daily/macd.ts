/**
 * MACD helpers aligned with `stock.md` (`calculate_macd`, pandas):
 *
 * 1. **EMA12** — close series (stock.md close column) with `ewm(span=12, adjust=False).mean()`
 * 2. **EMA26** — close series with `ewm(span=26, adjust=False).mean()`
 * 3. **DIF** — `EMA12 - EMA26`
 * 4. **DEA** — `DIF` with `ewm(span=9, adjust=False).mean()` (signal line)
 * 5. **MACD** (histogram) — `(DIF - DEA) * 2`
 *
 * `get_macd` streak counts compare consecutive **MACD** bars (same rule as `stock.md`).
 *
 * Core recurrence uses **decimal.js** (base-10) so long EWM chains avoid IEEE-754 drift vs repeated native float ops.
 *
 * Used by fund routes (`/api/finance/fund/.../ohlcv/...`) and market batch/legacy routes (`/api/finance/market/daily...`) via {@link attachMacdIndicators}.
 */

import Decimal from 'decimal.js'

/** Decimal precision for EWM / MACD intermediates (pandas parity is numeric; this avoids float drift). */
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
 * Exponential weighted mean with pandas `Series.ewm(span, adjust=False).mean()` semantics on Decimal values:
 * y[0]=x[0], then y[t] = alpha * x[t] + (1 - alpha) * y[t-1], alpha = 2 / (span + 1).
 *
 * @param values Input series as Decimals (e.g. closes or DIF)
 * @param span EWM span (12, 26, or 9 for signal)
 * @returns Smoothed series of same length
 */
function ewmAdjustFalseDecimals(values: Decimal[], span: number): Decimal[] {
  if (values.length === 0) return []
  const alpha = new Decimal(2).dividedBy(span + 1)
  const oneMinusAlpha = new Decimal(1).minus(alpha)
  const out: Decimal[] = []
  let y = values[0]
  out.push(y)
  for (let i = 1; i < values.length; i += 1) {
    y = alpha.times(values[i]).plus(oneMinusAlpha.times(y))
    out.push(y)
  }
  return out
}

/**
 * Exponential weighted mean with pandas `Series.ewm(span, adjust=False).mean()` semantics: y[0]=x[0], then
 * y[t] = alpha * x[t] + (1 - alpha) * y[t-1], alpha = 2 / (span + 1).
 *
 * @param values Input series (e.g. close prices or DIF)
 * @param span EWM span (12, 26, or 9 for signal)
 * @returns Smoothed series of same length
 */
export function ewmAdjustFalse(values: number[], span: number): number[] {
  if (values.length === 0) return []
  const decimals = values.map(toDecimal)
  return ewmAdjustFalseDecimals(decimals, span).map((d) => d.toNumber())
}

/**
 * Full MACD component series from closes (pandas `calculate_macd` in `stock.md`).
 */
export interface MacdIndicatorSeries {
  /** **EMA12** — `stock.md` / `df["EMA12"]`; fast EWM of close (span 12, adjust=False) */
  ema12: number[]
  /** **EMA26** — `stock.md` / `df["EMA26"]`; slow EWM of close (span 26, adjust=False) */
  ema26: number[]
  /** **DIF** — `stock.md` / `df["DIF"]` (= EMA12 minus EMA26) */
  dif: number[]
  /** **DEA** — `stock.md` / `df["DEA"]`; EWM of DIF (span 9, adjust=False) */
  dea: number[]
  /** **MACD** histogram — `stock.md` / `df["MACD"]` (= (DIF minus DEA) times 2) */
  macd: number[]
}

/**
 * Compute **EMA12**, **EMA26**, **DIF**, **DEA**, and **MACD** per bar — same pipeline as `stock.md` `calculate_macd`
 * (close column then EMA12/EMA26 then DIF then DEA then MACD), pandas `ewm(span, adjust=False).mean()` semantics.
 *
 * @param closes Close prices (same meaning as stock.md close column), chronological (oldest → newest)
 * @returns Five aligned series (same length as `closes`)
 */
export function computeMacdSeriesFromClose(closes: number[]): MacdIndicatorSeries {
  const n = closes.length
  if (n === 0) {
    return { ema12: [], ema26: [], dif: [], dea: [], macd: [] }
  }
  const decCloses = closes.map(toDecimal)
  /** stock.md `df["EMA12"]`, span 12 */
  const ema12d = ewmAdjustFalseDecimals(decCloses, 12)
  /** stock.md `df["EMA26"]`, span 26 */
  const ema26d = ewmAdjustFalseDecimals(decCloses, 26)
  /** stock.md `df["DIF"]` */
  const difd = ema12d.map((a, i) => a.minus(ema26d[i]))
  /** stock.md `df["DEA"]`, EWM of DIF span 9 */
  const deaDecimals = ewmAdjustFalseDecimals(difd, 9)
  /** stock.md `df["MACD"]`, (DIF minus DEA) times 2 */
  const macdd = difd.map((d, i) => d.minus(deaDecimals[i]).times(2))
  return {
    ema12: ema12d.map((d) => d.toNumber()),
    ema26: ema26d.map((d) => d.toNumber()),
    dif: difd.map((d) => d.toNumber()),
    dea: deaDecimals.map((d) => d.toNumber()),
    macd: macdd.map((d) => d.toNumber()),
  }
}

/**
 * Build MACD histogram (bar) series from closes (pandas / `stock.md`).
 *
 * @param closes Close prices in chronological order (oldest → newest)
 * @returns MACD bar per bar (same length as closes)
 */
export function buildMacdHistogramFromClose(closes: number[]): number[] {
  return computeMacdSeriesFromClose(closes).macd
}

/**
 * Count consecutive MACD bar increases from the end, then consecutive decreases (Python `get_macd` logic).
 * Skips non-finite histogram values and stops when a compared pair is not both finite.
 *
 * @param macdSeries MACD histogram values, oldest → newest
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
