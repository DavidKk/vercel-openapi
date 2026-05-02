import { parseSymbols } from '@/services/finance/market/daily'

/**
 * Parse a single fund path segment into a canonical symbol (six-digit or XAUUSD).
 *
 * @param segment URL segment (e.g. `518880` or `XAUUSD`)
 * @returns Symbol or null when not exactly one listable symbol
 */
export function singleFundPathSymbol(segment: string): string | null {
  const raw = decodeURIComponent(segment).trim()
  const symbols = parseSymbols(raw)
  if (symbols.length !== 1) return null
  return symbols[0]
}
