import type { StockMarket } from '@/services/finance/stock/types'

/**
 * Stock market route options with URL slug mapping.
 */
export const STOCK_MARKET_ROUTE_OPTIONS: Array<{ slug: string; market: StockMarket }> = [
  { slug: 'tasi', market: 'TASI' },
  { slug: 'sp500', market: 'S&P 500' },
  { slug: 'dow-jones', market: 'Dow Jones' },
  { slug: 'nasdaq', market: 'Nasdaq' },
  { slug: 'dax-30', market: 'DAX 30' },
  { slug: 'cac-40', market: 'CAC 40' },
  { slug: 'kospi', market: 'KOSPI' },
  { slug: 'hang-seng', market: 'Hang Seng' },
  { slug: 'csi-300', market: 'CSI 300' },
  { slug: 'nikkei-225', market: 'Nikkei 225' },
  { slug: 'vn-index', market: 'VN Index' },
]

/**
 * Parse stock market by route slug.
 *
 * @param slug Route segment
 * @returns Market value or null
 */
export function getMarketBySlug(slug: string): StockMarket | null {
  const found = STOCK_MARKET_ROUTE_OPTIONS.find((item) => item.slug === slug)
  return found?.market ?? null
}

/**
 * Resolve route slug by market.
 *
 * @param market Market value
 * @returns Route slug
 */
export function getSlugByMarket(market: StockMarket): string {
  const found = STOCK_MARKET_ROUTE_OPTIONS.find((item) => item.market === market)
  return found?.slug ?? 'tasi'
}
