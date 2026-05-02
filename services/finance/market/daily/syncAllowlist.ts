import { FUND_ETF_OHLCV_SYMBOLS } from '@/app/finance/constants/fundEtfOhlcv'

import { isFundNavSixDigitSymbol } from './fundNavSymbols'

const FUND_ETF_OHLCV_SYMBOL_SET = new Set<string>(FUND_ETF_OHLCV_SYMBOLS)

/** Symbols allowed for on-demand Turso backfill via Eastmoney **spot** kline (not six-digit). */
const MARKET_DAILY_PRECIOUS_OHLCV_SYMBOL_SET = new Set<string>(['XAUUSD'])

/**
 * Whether every symbol is a configured fund/ETF six-digit code (eligible for `syncIfEmpty` / on-demand Eastmoney ingest).
 *
 * @param symbols Parsed six-digit codes (must be non-empty)
 * @returns True when the whole set may trigger allowlisted sync
 */
export function isFundEtfOhlcvSymbolSetAllowedForSync(symbols: string[]): boolean {
  return symbols.length > 0 && symbols.every((s) => FUND_ETF_OHLCV_SYMBOL_SET.has(s))
}

/**
 * Whether every symbol is allowlisted for exchange-style daily OHLCV sync (fund/ETF six-digit **or** precious spot tickers).
 * Mixed requests are allowed when each symbol is individually allowlisted.
 *
 * @param symbols Parsed symbols from {@link parseSymbols}
 * @returns True when `syncIfEmpty` may run Eastmoney range ingest for this set
 */
export function isMarketDailyOhlcvSymbolSetAllowedForSync(symbols: string[]): boolean {
  if (symbols.length === 0) return false
  return symbols.every((s) => FUND_ETF_OHLCV_SYMBOL_SET.has(s) || MARKET_DAILY_PRECIOUS_OHLCV_SYMBOL_SET.has(s))
}

/**
 * Whether every symbol is both a configured fund NAV code and in the finance fund/ETF catalog (for NAV route `syncIfEmpty`).
 *
 * @param symbols Parsed six-digit codes
 * @returns True when on-demand ingest is allowed for this NAV-only set
 */
export function isFundNavSymbolSetAllowedForSync(symbols: string[]): boolean {
  return symbols.length > 0 && symbols.every((s) => isFundNavSixDigitSymbol(s) && FUND_ETF_OHLCV_SYMBOL_SET.has(s))
}
