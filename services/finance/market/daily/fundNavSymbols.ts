/**
 * Six-digit symbols whose offline CSV series are fund NAV (unit net value + daily return),
 * not exchange-traded OHLCV. Ingest uses Eastmoney fund LSJZ instead of stock kline.
 *
 * Append new fund codes here when adding matching CSV files.
 */
export const FUND_NAV_SIX_DIGIT_CODES = ['012922', '016665'] as const

/** Union type of configured fund NAV codes */
export type FundNavSixDigitCode = (typeof FUND_NAV_SIX_DIGIT_CODES)[number]

const FUND_NAV_CODE_SET = new Set<string>(FUND_NAV_SIX_DIGIT_CODES)

/**
 * Whether a six-digit symbol should use fund NAV history (LSJZ) rather than stock kline.
 *
 * @param symbol Six-digit market symbol
 * @returns True when the symbol is listed as a fund NAV code
 */
export function isFundNavSixDigitSymbol(symbol: string): boolean {
  return FUND_NAV_CODE_SET.has(symbol)
}
