import { FUND_ETF_OHLCV_SYMBOLS } from '@/app/finance/constants/fundEtfOhlcv'

const FUND_ETF_OHLCV_SYMBOL_SET = new Set<string>(FUND_ETF_OHLCV_SYMBOLS)

/**
 * Whether every symbol is a configured fund/ETF six-digit code (eligible for `syncIfEmpty` / on-demand Eastmoney ingest).
 *
 * @param symbols Parsed six-digit codes (must be non-empty)
 * @returns True when the whole set may trigger allowlisted sync
 */
export function isFundEtfOhlcvSymbolSetAllowedForSync(symbols: string[]): boolean {
  return symbols.length > 0 && symbols.every((s) => FUND_ETF_OHLCV_SYMBOL_SET.has(s))
}
