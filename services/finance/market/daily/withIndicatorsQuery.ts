/** Values that explicitly disable MACD streak on latest-OHLCV routes (case-insensitive, trimmed). */
const WITH_INDICATORS_LATEST_OFF = new Set(['false', '0', 'no', 'off'])

/**
 * Parse `withIndicators` for latest-OHLCV HTTP routes: defaults to **true** (MACD streak on latest bar).
 * Pass `false`, `0`, `no`, or `off` (case-insensitive, trimmed) to skip computation.
 *
 * @param raw Raw query value or null when the key is absent
 * @returns Whether to attach MACD streak counts
 */
export function parseWithIndicatorsLatestDefaultTrue(raw: string | null): boolean {
  if (raw == null || raw === '') return true
  const v = raw.trim().toLowerCase()
  return !WITH_INDICATORS_LATEST_OFF.has(v)
}
