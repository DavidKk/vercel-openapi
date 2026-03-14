/**
 * Format a number for display with comma-separated thousands (e.g. 236209008 → "236,209,008").
 * Returns "–" for null, undefined, or non-finite values.
 *
 * @param n Value to format
 * @param options.maxFractionDigits Maximum decimal places (default 2 for small numbers, 0 for integers when known)
 * @returns Formatted string or "–"
 */
export function formatNumber(n: number | null | undefined, options?: { maxFractionDigits?: number }): string {
  if (n == null || !Number.isFinite(n)) return '–'
  const maxFractionDigits = options?.maxFractionDigits ?? 2
  return Number(n).toLocaleString('en-US', {
    maximumFractionDigits: maxFractionDigits,
    minimumFractionDigits: 0,
  })
}

/**
 * Format a percent value for display (number + "%"). Uses comma-separated thousands.
 * Returns "–" for null, undefined, or non-finite values.
 *
 * @param n Percent value (e.g. 1.5 for 1.5%)
 * @param options.maxFractionDigits Maximum decimal places (default 2)
 * @returns Formatted string like "1.5%" or "–"
 */
export function formatPercent(n: number | null | undefined, options?: { maxFractionDigits?: number }): string {
  if (n == null || !Number.isFinite(n)) return '–'
  return formatNumber(n, options) + '%'
}
