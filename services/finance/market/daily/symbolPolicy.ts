import { isFundNavSixDigitSymbol } from './fundNavSymbols'

/**
 * Error text when fund NAV-only codes are passed to exchange OHLCV routes.
 *
 * @param symbols Parsed six-digit symbols
 * @returns Empty string when OK; otherwise a single message for HTTP 400
 */
export function marketDailySymbolsRejectionMessage(symbols: string[]): string {
  const nav = symbols.filter(isFundNavSixDigitSymbol)
  if (nav.length === 0) return ''
  return `Use GET /api/finance/fund/nav/daily for fund NAV codes (not exchange OHLCV). Remove: ${nav.join(', ')}`
}

/**
 * Error text when a non–fund-NAV code is passed to fund NAV-only routes.
 *
 * @param symbols Parsed six-digit symbols
 * @returns Empty string when OK
 */
export function fundNavDailySymbolsRejectionMessage(symbols: string[]): string {
  const bad = symbols.filter((s) => !isFundNavSixDigitSymbol(s))
  if (bad.length === 0) return ''
  return `Only configured fund NAV six-digit codes are allowed. Rejected: ${bad.join(', ')}`
}
