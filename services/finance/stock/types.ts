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
  /** Daily % change (Yahoo: vs chartPreviousClose; Eastmoney: kline changeRate). */
  changePercent: number | null
  /** Share / contract volume; null when upstream omits it (some index bars use zero volume). */
  volumeTraded: number | null
  /**
   * TASI: exchange turnover in SAR. Yahoo: close×volume when volume known. Eastmoney: 成交额 when present.
   */
  valueTraded: number | null
  /**
   * `fmp` is legacy Turso-only; new rows use Yahoo (US + fallback) or Eastmoney global-index `secid` where wired.
   */
  source: 'tasi' | 'yahoo' | 'eastmoney-index' | 'fmp'
}
