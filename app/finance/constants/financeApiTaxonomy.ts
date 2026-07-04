/**
 * Finance REST documentation grouping: majors match sidebar (Stocks / Funds / Precious metals).
 * Chinese gloss for naming discussions:
 * - Stocks: 股票市场 — 指数快照（TASI 最新走 stock/summary）、指数日/小时（feed 仅 TASI；无成分股列表）。
 * - Funds: 基金 — 六位数「交易所日 K」vs「净值日序」两类日数据。
 * - Precious metals: 贵金属 — 品类；XAUUSD 走东财 `122.XAU` 日 K，存 Turso `source=eastmoney-precious-spot`；与 A 股 `eastmoney`、净值 `eastmoney-fund-nav` 区分。
 */

/** Major product line (sidebar-aligned) */
export const FINANCE_MAJOR = {
  stocks: 'Stocks',
  funds: 'Funds',
  preciousMetals: 'Precious metals',
} as const

/** Stocks section subtitle in API docs (pair with FINANCE_MAJOR.stocks in headings). */
export const STOCKS_API_SECTION_TITLE = 'Market index & listed companies'

/** Stock-market REST subgroup for multi-market index snapshots. */
export const STOCKS_API_SUBGROUP = {
  indexSnapshotMultiMarket: 'Index — latest snapshot (multi-market)',
  indexDailySeries: 'Index — daily summary (Turso history)',
} as const

/** Funds section subtitle in API docs (pair with FINANCE_MAJOR.funds in headings). */
export const FUNDS_API_SECTION_TITLE = 'Six-digit daily series'

/**
 * Two fund/ETF **daily** response families (same calendar idea, different upstream semantics).
 * - Traded: 上市基金/ETF 在交易所撮合形成的 OHLCV 日 K。
 * - NAV: 场外基金披露的单位净值 + 日涨跌幅（LSJZ），不是交易所 OHLCV。
 */
export const FUNDS_DAILY_SUBTYPE = {
  /** Eastmoney stock kline shape: OHLCV + amplitude / turnover, etc. */
  exchangeDailyBars: 'Traded fund / ETF — exchange daily bars (OHLCV)',
  /** Eastmoney LSJZ shape: unit NAV + daily return %. */
  navDisclosureDaily: 'Fund NAV — disclosure daily series (unit + return %)',
} as const

/** Cross-cutting analytics for allowlisted six-digit symbols (not a third daily upstream). */
export const FUNDS_OVERVIEW_STOCKLIST_TITLE = 'Funds / ETFs — latest bar + MACD (aggregated)'

/** Precious metals API docs subtitle (pair with FINANCE_MAJOR.preciousMetals in h2). */
export const PRECIOUS_METALS_API_SECTION_SUBTITLE = 'Spot bullion (reserved)'

/** Precious metals: same OHLCV route as funds/ETF daily bars, separate Turso `source`. */
export const PRECIOUS_METALS_API_PLACEHOLDER =
  'Spot bullion daily OHLCV via GET /api/finance/fund/XAUUSD/ohlcv/daily (allowlisted for sync). Rows persist in Turso with source eastmoney-precious-spot. Only XAUUSD in scope today.'
