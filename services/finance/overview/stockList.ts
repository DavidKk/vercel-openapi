import { getFundEtfDisplayName } from '@/app/finance/constants/fundEtfOhlcv'
import { attachMacdIndicators, getMarketDailyWithOptionalSync, isFundEtfOhlcvSymbolSetAllowedForSync, parseDate, parseSymbols } from '@/services/finance/market/daily'
import type { FinanceMarketDailyRecord } from '@/services/finance/market/daily/types'

/**
 * One row of the overview stock list (same shape as `stock.md` sample `stockList` entries).
 */
export interface OverviewStockListItem {
  /** Latest bar date in range for this symbol, or empty when no rows */
  date: string
  /** Six-digit symbol */
  stockCode: string
  /** Display name (from fund/ETF catalog when known) */
  stockName: string
  /** Latest close / unit NAV in range */
  price: number
  /** Consecutive MACD histogram increases from the latest bar (Python `get_macd` macd_sum_up) */
  macdUp: number
  /** Consecutive MACD histogram decreases after the up phase (Python `get_macd` macd_sum_down) */
  macdDown: number
}

/**
 * Build ordered overview rows from enriched daily records (latest bar per symbol).
 *
 * @param symbolOrder Request order of symbols
 * @param records Rows after MACD enrichment
 * @param fallbackEndDate End date string used when a symbol has no rows
 * @returns stockList entries
 */
export function buildOverviewStockListEntries(symbolOrder: string[], records: FinanceMarketDailyRecord[], fallbackEndDate: string): OverviewStockListItem[] {
  const result: OverviewStockListItem[] = []
  for (const code of symbolOrder) {
    const rows = records.filter((r) => r.symbol === code).sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))
    const latest = rows[rows.length - 1]
    if (!latest) {
      result.push({
        date: fallbackEndDate,
        stockCode: code,
        stockName: getFundEtfDisplayName(code),
        price: 0,
        macdUp: 0,
        macdDown: 0,
      })
      continue
    }
    const macdUp = typeof latest.macdUp === 'number' ? latest.macdUp : 0
    const macdDown = typeof latest.macdDown === 'number' ? latest.macdDown : 0
    result.push({
      date: latest.date,
      stockCode: code,
      stockName: getFundEtfDisplayName(code),
      price: latest.close,
      macdUp,
      macdDown,
    })
  }
  return result
}

/**
 * Load daily OHLCV/NAV for symbols, optionally backfill Turso, compute MACD, return one aggregated row per symbol (not the full daily table).
 *
 * @param options Query parameters
 * @returns stockList plus whether an on-demand ingest ran
 */
export async function getOverviewStockList(options: {
  symbolsRaw: string
  startDate: string
  endDate: string
  syncIfEmpty?: boolean
}): Promise<{ stockList: OverviewStockListItem[]; synced: boolean }> {
  const symbols = parseSymbols(options.symbolsRaw)
  const sd = parseDate(options.startDate)
  const ed = parseDate(options.endDate)
  if (symbols.length === 0 || !sd || !ed || sd > ed) {
    return { stockList: [], synced: false }
  }
  const allow = isFundEtfOhlcvSymbolSetAllowedForSync(symbols)
  const { items, synced } = await getMarketDailyWithOptionalSync({
    symbolsRaw: options.symbolsRaw,
    startDate: options.startDate,
    endDate: options.endDate,
    withIndicators: false,
    syncIfEmpty: options.syncIfEmpty ?? false,
    allowOnDemandIngest: allow,
  })
  const enriched = attachMacdIndicators(items)
  const stockList = buildOverviewStockListEntries(symbols, enriched, ed)
  return { stockList, synced }
}
