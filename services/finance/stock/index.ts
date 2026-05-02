import { createLogger } from '@/services/logger'

import { getSummaryDaily } from '../tasi'
import { readLatestStockSummary, upsertStockSummaryDaily } from './turso'
import type { StockMarket, StockMarketSummary } from './types'
import { fetchUpstreamIndexSummary } from './upstreamIndexSummary'

const logger = createLogger('finance-stock')
const coldStartRefreshInFlight = new Map<StockMarket, Promise<StockMarketSummary | null>>()

/**
 * Detect Turso rows that should be refreshed: legacy FMP payloads, or incomplete Yahoo/Eastmoney rows.
 *
 * @param row Cached summary row
 * @returns True when cache should be bypassed for refresh
 */
function stockSummaryCacheShouldRefresh(row: StockMarketSummary): boolean {
  if (row.source === 'fmp') return true
  if (row.close == null) return false
  return row.changePercent == null && row.volumeTraded == null && row.valueTraded == null
}

/**
 * Supported stock markets in overview dropdown.
 */
export const STOCK_MARKETS: StockMarket[] = ['TASI', 'S&P 500', 'Dow Jones', 'Nasdaq', 'DAX 30', 'CAC 40', 'KOSPI', 'Hang Seng', 'CSI 300', 'Nikkei 225', 'VN Index']

/**
 * Convert market value into a valid StockMarket.
 *
 * @param value Raw market value
 * @returns StockMarket or null
 */
export function parseStockMarket(value: string): StockMarket | null {
  return STOCK_MARKETS.includes(value as StockMarket) ? (value as StockMarket) : null
}

/**
 * Map TASI summary shape into stock summary.
 *
 * @param market Market name
 * @returns Stock summary or null
 */
async function getTasiSummaryAsStock(market: 'TASI'): Promise<StockMarketSummary | null> {
  const data = await getSummaryDaily({})
  if (!data || Array.isArray(data)) return null
  const date = data.date ?? new Date().toISOString().slice(0, 10)
  return {
    market,
    date,
    open: data.open ?? null,
    high: data.high ?? null,
    low: data.low ?? null,
    close: data.close ?? null,
    change: data.change ?? null,
    changePercent: data.changePercent ?? null,
    volumeTraded: data.volumeTraded ?? null,
    valueTraded: data.valueTraded ?? null,
    source: 'tasi',
  }
}

/**
 * Get summary for one stock market with persistence.
 * Uses daily cache in Turso; refreshes from upstream (TASI bridge; other markets Eastmoney + Yahoo fallback, no API key).
 * Bypasses Turso for legacy `fmp` rows or rows missing change/volume/value fields.
 *
 * @param market Market key
 * @returns Latest available summary or null
 */
export async function getStockSummary(market: StockMarket): Promise<StockMarketSummary | null> {
  const cached = await readLatestStockSummary(market)
  if (cached && !stockSummaryCacheShouldRefresh(cached)) return cached

  const existingRefresh = coldStartRefreshInFlight.get(market)
  if (existingRefresh) return existingRefresh

  const refreshPromise = (async () => {
    try {
      const fresh = market === 'TASI' ? await getTasiSummaryAsStock('TASI') : await fetchUpstreamIndexSummary(market)
      if (!fresh) return null
      await upsertStockSummaryDaily(fresh)
      logger.info('getStockSummary cold-start refresh success', { market, date: fresh.date, source: fresh.source })
      return fresh
    } finally {
      coldStartRefreshInFlight.delete(market)
    }
  })()

  coldStartRefreshInFlight.set(market, refreshPromise)
  return refreshPromise
}

/**
 * Batch get stock summary for API usage.
 * Runs the same path as {@link getStockSummary} per market (Turso cache, else cold-start fetch and upsert).
 *
 * @param markets Market list
 * @returns Non-null summaries only (markets with no upstream data are omitted)
 */
export async function getStockSummaryBatch(markets: StockMarket[]): Promise<StockMarketSummary[]> {
  const list = await Promise.all(markets.map((market) => getStockSummary(market)))
  return list.filter((item): item is StockMarketSummary => item != null)
}

/**
 * Run one pass daily ingest for selected stock markets.
 *
 * @param markets Optional subset of markets
 * @returns Ingest stats
 */
export async function runStockSummaryIngest(markets?: StockMarket[]): Promise<{ total: number; success: number; failed: number }> {
  const list = markets && markets.length > 0 ? markets : STOCK_MARKETS
  let success = 0
  for (const market of list) {
    try {
      const fresh = market === 'TASI' ? await getTasiSummaryAsStock('TASI') : await fetchUpstreamIndexSummary(market)
      if (!fresh) continue
      await upsertStockSummaryDaily(fresh)
      success += 1
    } catch (error) {
      logger.warn('runStockSummaryIngest failed for market', {
        market,
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }
  return {
    total: list.length,
    success,
    failed: list.length - success,
  }
}

export type { StockMarket, StockMarketSummary } from './types'
