import type { StockMarket } from '@/services/finance/stock/types'

/**
 * Stock overview markets disabled in the dropdown / loader (empty = none).
 * Name is historical (`FMP_*`); data path no longer uses Financial Modeling Prep.
 */
export const FMP_UNSUPPORTED_STOCK_MARKETS = new Set<StockMarket>()
