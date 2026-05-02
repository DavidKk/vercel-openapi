import { FUND_ETF_DEFAULT_SYMBOL, type FundEtfOhlcvSymbol, isFundEtfOhlcvSymbol } from '../constants/fundEtfOhlcv'

export { FUND_ETF_DEFAULT_SYMBOL }

/**
 * Resolve a route segment to a configured fund/ETF symbol.
 *
 * @param slug URL param under `/finance/fund/[symbol]`
 * @returns Symbol when valid, otherwise null
 */
export function getFundEtfSymbolBySlug(slug: string): FundEtfOhlcvSymbol | null {
  return isFundEtfOhlcvSymbol(slug) ? slug : null
}
