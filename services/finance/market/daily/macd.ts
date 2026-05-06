/**
 * MACD helpers aligned with `stock.md` Python: `Series.ewm(span, adjust=False).mean()` for EMA12, EMA26, and DEA;
 * MACD histogram = (DIF - DEA) * 2; streak counts match Python `get_macd` (compare consecutive finite histogram bars).
 *
 * Used by fund routes (`/api/finance/fund/.../ohlcv/...`) and market batch/legacy routes (`/api/finance/market/daily...`) via {@link attachMacdIndicators}.
 */

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
  const alpha = 2 / (span + 1)
  const out: number[] = []
  let y = values[0]
  out.push(y)
  for (let i = 1; i < values.length; i += 1) {
    y = alpha * values[i] + (1 - alpha) * y
    out.push(y)
  }
  return out
}

/**
 * Full MACD component series from closes (pandas `calculate_macd` in `stock.md`).
 */
export interface MacdIndicatorSeries {
  /** Fast EMA of close */
  ema12: number[]
  /** Slow EMA of close */
  ema26: number[]
  /** DIF = ema12 - ema26 */
  dif: number[]
  /** Signal line (DEA), EWM of DIF */
  dea: number[]
  /** MACD histogram = (DIF - DEA) * 2 */
  macd: number[]
}

/**
 * Compute EMA12/26, DIF, DEA, and MACD histogram per bar (pandas `ewm(..., adjust=False)`).
 *
 * @param closes Close prices in chronological order (oldest → newest)
 * @returns Five aligned series (same length as closes)
 */
export function computeMacdSeriesFromClose(closes: number[]): MacdIndicatorSeries {
  const n = closes.length
  if (n === 0) {
    return { ema12: [], ema26: [], dif: [], dea: [], macd: [] }
  }
  const ema12 = ewmAdjustFalse(closes, 12)
  const ema26 = ewmAdjustFalse(closes, 26)
  const dif = closes.map((_, i) => ema12[i] - ema26[i])
  const dea = ewmAdjustFalse(dif, 9)
  const macd = dif.map((d, i) => (d - dea[i]) * 2)
  return { ema12, ema26, dif, dea, macd }
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
 * @returns Streak counts (macdUp, macdDown) for the latest regime
 */
export function getMacdStreakUpDownFromHistogram(macdSeries: number[]): { up: number; down: number } {
  let i = macdSeries.length - 1
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
