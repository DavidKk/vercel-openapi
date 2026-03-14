/**
 * TASI company daily record (matches cf-feed-bridge API shape).
 * Used for storage payload and API responses.
 */
export interface TasiCompanyDailyRecord {
  no: number | null
  code: string
  name: string
  lastPrice: number | null
  changePercent: number | null
  change: number | null
  volume: number | null
  turnover: number | null
  amplitude: number | null
  high: number | null
  low: number | null
  open: number | null
  prevClose: number | null
  volumeRatio: number | null
  turnoverRate: number | null
  peRatio: number | null
  pbRatio: number | null
  marketCap: number | null
  circulatingMarketCap: number | null
  numberOfTrades: number | null
  speed: number | null
  change_5m: number | null
  change_60d: number | null
  change_ytd: number | null
  date: string | null
}

/**
 * TASI market summary (matches cf-feed-bridge API shape).
 */
export interface TasiMarketSummary {
  date: string | null
  open: number | null
  high: number | null
  low: number | null
  close: number | null
  change: number | null
  changePercent: number | null
  companiesTraded: number | null
  volumeTraded: number | null
  valueTraded: number | null
  numberOfTrades: number | null
  marketCap: number | null
  notes?: string | null
}
