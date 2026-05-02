/**
 * MACD helpers aligned with `stock.md` Python: `ewm(span, adjust=False).mean()` for EMA12/EMA26/DEA,
 * MACD = (DIF - DEA) * 2, and streak counts from the latest bar backward (same control flow as Python `get_macd`).
 */

/**
 * Exponential weighted mean with pandas `Series.ewm(span, adjust=False).mean()` semantics: y[0]=x[0], then
 * y[t] = alpha * x[t] + (1 - alpha) * y[t-1], alpha = 2 / (span + 1).
 *
 * @param values Input series (e.g. close prices)
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
 * Build MACD histogram (bar) series from close prices: DIF = EMA12 - EMA26, DEA = EWM9(DIF), MACD = 2*(DIF-DEA).
 *
 * @param closes Close prices in chronological order (oldest → newest)
 * @returns MACD bar value per bar (same length as closes)
 */
export function buildMacdHistogramFromClose(closes: number[]): number[] {
  if (closes.length === 0) return []
  const ema12 = ewmAdjustFalse(closes, 12)
  const ema26 = ewmAdjustFalse(closes, 26)
  const dif = closes.map((_, i) => ema12[i] - ema26[i])
  const dea = ewmAdjustFalse(dif, 9)
  return dif.map((d, i) => (d - dea[i]) * 2)
}

/**
 * Count consecutive MACD bar increases from the end, then consecutive decreases (Python `get_macd` logic;
 * compares each bar with the previous chronological bar only, so index runs from last down to 1).
 *
 * @param macdSeries MACD histogram values, oldest → newest
 * @returns Streak counts (macdUp, macdDown) for the latest regime
 */
export function getMacdStreakUpDownFromHistogram(macdSeries: number[]): { up: number; down: number } {
  let isRise = true
  let up = 0
  let down = 0
  for (let i = macdSeries.length - 1; i >= 1; i -= 1) {
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
