/**
 * Supported stock markets in Stock overview dropdown.
 */
export type StockMarket = 'TASI' | 'S&P 500' | 'Dow Jones' | 'Nasdaq' | 'DAX 30' | 'CAC 40' | 'KOSPI' | 'Hang Seng' | 'CSI 300' | 'Nikkei 225' | 'VN Index'

/**
 * Normalized market summary payload used by Stock overview.
 */
export interface StockMarketSummary {
  market: StockMarket
  date: string
  open: number | null
  high: number | null
  low: number | null
  close: number | null
  change: number | null
  /** Daily % change; FMP from changesPercentage / changePercentage or derived from previousClose vs price. */
  changePercent: number | null
  /** Share / contract volume; FMP from volume (or avg aliases). Null when upstream omits it. */
  volumeTraded: number | null
  /**
   * TASI: exchange turnover in SAR. FMP indices: close×volume when both known (notional index units, not SAR).
   */
  valueTraded: number | null
  source: 'tasi' | 'fmp'
}
