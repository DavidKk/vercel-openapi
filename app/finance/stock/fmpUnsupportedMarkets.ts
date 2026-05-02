import type { StockMarket } from '@/services/finance/stock/types'

/**
 * Index names shown in the stock overview UI but not yet backed by FMP summary wiring.
 */
export const FMP_UNSUPPORTED_STOCK_MARKETS = new Set<StockMarket>(['DAX 30', 'CAC 40', 'KOSPI', 'CSI 300', 'VN Index'])
