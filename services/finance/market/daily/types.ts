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
  /** eastmoney: exchange kline; eastmoney-fund-nav: fund unit NAV + daily return % */
  source: 'eastmoney' | 'eastmoney-fund-nav'
  isPlaceholder: boolean
  macdUp?: number | null
  macdDown?: number | null
}
