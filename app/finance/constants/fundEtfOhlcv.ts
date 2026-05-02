/**
 * Fund / ETF / LOF six-digit symbols backed by offline CSV under `股票历史数据/` (ingest + `/finance/fund`).
 * Order: numeric sort. NAV-only codes use Eastmoney LSJZ via {@link isFundNavSixDigitSymbol} in services.
 */
const FUND_ETF_SYMBOL_ORDER = [
  '012922',
  '016665',
  '159201',
  '159352',
  '159518',
  '159636',
  '159687',
  '159915',
  '159980',
  '159981',
  '159985',
  '161815',
  '501225',
  '501312',
  '510300',
  '512100',
  '513310',
  '513660',
  '513730',
  '515180',
  '518880',
  '520580',
  '520990',
  '560150',
  '563020',
  '588090',
  '899050',
] as const

/** Union type of configured fund/ETF symbols */
export type FundEtfOhlcvSymbol = (typeof FUND_ETF_SYMBOL_ORDER)[number]

/**
 * Display name only (no six-digit code). Keys must cover every entry in {@link FUND_ETF_SYMBOL_ORDER}
 * (TypeScript enforces this via `satisfies Record<…>`). Short labels for header `name (code)`.
 */
const FUND_ETF_DISPLAY_NAMES = {
  '012922': '易方达全球成长精选C',
  '016665': '天弘全球高端制造C',
  '159201': '华夏国证自由现金流ETF',
  '159352': 'A500ETF南方',
  '159518': '标普油气ETF',
  '159636': '港股通科技30ETF工银',
  '159687': '亚太精选ETF南方',
  '159915': '易方达创业板ETF',
  '159980': '有色期货ETF',
  '159981': '能源化工期货ETF',
  '159985': '豆粕ETF',
  '161815': '银华抗通胀主题A',
  '501225': '景顺全球半导体芯片A',
  '501312': '海外科技LOF',
  '510300': '沪深300ETF',
  '512100': '中证1000ETF',
  '513310': '中韩半导体ETF',
  '513660': '华夏沪港通恒生ETF',
  '513730': '东南亚科技ETF',
  '515180': '红利 ETF',
  '518880': '黄金 ETF',
  '520580': '新兴亚洲ETF',
  '520990': '港股红利ETF',
  '560150': '红利低波ETF泰康',
  '563020': '红利低波ETF易方达',
  '588090': '科创50ETF',
  '899050': '北证50',
} as const satisfies Record<FundEtfOhlcvSymbol, string>

const FUND_ETF_SYMBOL_SET = new Set<string>(FUND_ETF_SYMBOL_ORDER as unknown as string[])

/**
 * Display name only (no six-digit code).
 *
 * @param symbol Configured fund/ETF code
 * @returns Short product label
 */
export function getFundEtfDisplayName(symbol: string): string {
  if (!FUND_ETF_SYMBOL_SET.has(symbol)) return symbol
  return FUND_ETF_DISPLAY_NAMES[symbol as FundEtfOhlcvSymbol]
}

/**
 * One-line title: product name with code in parentheses, e.g. `红利 ETF (515180)`.
 *
 * @param symbol Configured fund/ETF code
 * @returns Title string for headers and menus
 */
export function formatFundEtfTitle(symbol: string): string {
  if (!FUND_ETF_SYMBOL_SET.has(symbol)) return symbol
  return `${getFundEtfDisplayName(symbol)} (${symbol})`
}

const FUND_ETF_OHLCV_ROWS = FUND_ETF_SYMBOL_ORDER.map((key) => ({
  key,
  title: formatFundEtfTitle(key),
}))

/** Keys as a list for cron and iteration */
export const FUND_ETF_OHLCV_SYMBOLS = [...FUND_ETF_SYMBOL_ORDER]

/**
 * Default route `/finance/fund` → prefer a liquid ETF row (not NAV) for first paint.
 */
export const FUND_ETF_DEFAULT_SYMBOL: FundEtfOhlcvSymbol = '515180'

/**
 * Rows for dropdowns: `key` is route segment, `title` is `name (code)`.
 */
export const FUND_ETF_OHLCV_SUB_TABS: ReadonlyArray<{ key: string; title: string }> = [...FUND_ETF_OHLCV_ROWS]

/**
 * Whether a symbol is one of the configured Fund/ETF tickers.
 *
 * @param symbol Raw route segment or code string
 * @returns True when the symbol is in the allowlist
 */
export function isFundEtfOhlcvSymbol(symbol: string): symbol is FundEtfOhlcvSymbol {
  return FUND_ETF_SYMBOL_SET.has(symbol)
}
