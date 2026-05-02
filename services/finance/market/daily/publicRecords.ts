import type { FinanceFundNavDailyRecord, FinanceMarketDailyRecord, FinanceMarketOhlcvDailyRecord } from './types'

/**
 * Map an internal persisted row to the exchange OHLCV public shape; skip fund NAV rows.
 * Every OHLCV object includes `macdUp` and `macdDown` (number or `null`), matching stock.md `stockList` MACD streak fields.
 *
 * @param row Row from Turso / ingest pipeline
 * @returns Public OHLCV object or null when the row is fund NAV
 */
export function toPublicOhlcvRecord(row: FinanceMarketDailyRecord): FinanceMarketOhlcvDailyRecord | null {
  if (row.source === 'eastmoney-fund-nav') return null
  return {
    date: row.date,
    symbol: row.symbol,
    open: row.open,
    close: row.close,
    high: row.high,
    low: row.low,
    volume: row.volume,
    amount: row.amount,
    amplitude: row.amplitude,
    changeRate: row.changeRate,
    changeAmount: row.changeAmount,
    turnoverRate: row.turnoverRate,
    macdUp: row.macdUp ?? null,
    macdDown: row.macdDown ?? null,
  }
}

/**
 * Map an internal persisted row to the fund NAV public shape; skip exchange kline rows.
 *
 * @param row Row from Turso / ingest pipeline
 * @returns Public NAV object or null when the row is not LSJZ-backed
 */
export function toPublicFundNavRecord(row: FinanceMarketDailyRecord): FinanceFundNavDailyRecord | null {
  if (row.source !== 'eastmoney-fund-nav') return null
  return {
    date: row.date,
    symbol: row.symbol,
    unitNav: row.close,
    dailyChangePercent: row.changeRate,
  }
}
