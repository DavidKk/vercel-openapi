/**
 * Daily OHLCV record for six-digit market symbols (MVP scope).
 */
export interface FinanceMarketDailyRecord {
  date: string
  symbol: string
  open: number
  close: number
  high: number
  low: number
  volume: number
  amount: number
  amplitude: number
  changeRate: number
  changeAmount: number
  turnoverRate: number
  /**
   * eastmoney: A-share / ETF six-digit kline; eastmoney-precious-spot: spot bullion (e.g. XAUUSD via 122.XAU);
   * eastmoney-fund-nav: fund unit NAV + daily return % (same row shape, different semantics);
   * eastmoney-global-index: `push2his` kline with explicit `secid` (e.g. 100.HSI, 1.000300).
   */
  source: 'eastmoney' | 'eastmoney-precious-spot' | 'eastmoney-fund-nav' | 'eastmoney-global-index'
  isPlaceholder: boolean
  macdUp?: number | null
  macdDown?: number | null
}

/**
 * Public REST row for exchange-traded daily bars (GET /api/finance/market/daily).
 * Omits internal `source` / `isPlaceholder` and never represents fund LSJZ NAV.
 */
export interface FinanceMarketOhlcvDailyRecord {
  date: string
  symbol: string
  open: number
  close: number
  high: number
  low: number
  volume: number
  amount: number
  amplitude: number
  changeRate: number
  changeAmount: number
  turnoverRate: number
  macdUp?: number | null
  macdDown?: number | null
}

/**
 * Public REST row for fund historical NAV (GET /api/finance/fund/nav/daily).
 */
export interface FinanceFundNavDailyRecord {
  date: string
  symbol: string
  unitNav: number
  dailyChangePercent: number
}
