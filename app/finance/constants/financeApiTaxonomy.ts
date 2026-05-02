/**
 * Finance REST documentation grouping: majors match sidebar (Stocks / Funds / Precious metals).
 * Chinese gloss for naming discussions:
 * - Stocks: 股票市场 — 指数快照、指数日/小时、成分日数据（当前 feed 仅 TASI）。
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

/**
 * Stock-market REST subgroups (exchange-scoped paths use `market=`; feed implemented for TASI only today).
 * 对应关系：多市场指数快照 + 单市场指数日 K / 小时 + 成分股日数据。
 */
export const STOCKS_API_SUBGROUP = {
  /** Multi-market latest bar (FMP + TASI where wired). */
  indexSnapshotMultiMarket: 'Index — latest snapshot (multi-market)',
  /** Exchange index daily OHLC / summary from feed. */
  indexDailyFromFeed: 'Index — daily series (exchange feed)',
  /** Exchange index hourly buckets vs daily alignment. */
  indexHourlyFromFeed: 'Index — hourly buckets (exchange feed)',
  /** Listed names daily list or per-code OHLC from feed. */
  constituentsDailyFromFeed: 'Constituents — daily list & OHLC (exchange feed)',
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
  'Use GET /api/finance/market/daily with symbols=XAUUSD (allowlisted for sync). Rows persist in Turso with source eastmoney-precious-spot (vs eastmoney for six-digit A-share/ETF kline, eastmoney-fund-nav for LSJZ NAV). Only XAUUSD in scope today.'
