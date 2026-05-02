import { createLogger } from '@/services/logger'

import { getSummaryDaily } from '../tasi'
import { readLatestStockSummary, upsertStockSummaryDaily } from './turso'
import type { StockMarket, StockMarketSummary } from './types'

const logger = createLogger('finance-stock')
const coldStartRefreshInFlight = new Map<StockMarket, Promise<StockMarketSummary | null>>()

const FMP_BASE_URL = process.env.FMP_BASE_URL?.trim() || 'https://financialmodelingprep.com/stable'

const FMP_SYMBOL_BY_MARKET: Record<Exclude<StockMarket, 'TASI'>, string> = {
  'S&P 500': '^GSPC',
  'Dow Jones': '^DJI',
  Nasdaq: '^IXIC',
  'DAX 30': '^GDAXI',
  'CAC 40': '^FCHI',
  KOSPI: '^KS11',
  'Hang Seng': '^HSI',
  'CSI 300': '000300.SS',
  'Nikkei 225': '^N225',
  'VN Index': '^VNINDEX',
}

const FMP_SUPPORTED_MARKETS = new Set<Exclude<StockMarket, 'TASI'>>(['S&P 500', 'Dow Jones', 'Nasdaq', 'Hang Seng', 'Nikkei 225'])

/**
 * Normalize unknown numeric payload to finite number.
 *
 * @param value Unknown payload value
 * @returns Finite number or null
 */
function toFiniteNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'bigint') {
    const n = Number(value)
    return Number.isFinite(n) ? n : null
  }
  if (typeof value === 'string') {
    const cleaned = value.replace(/[,%\s()]/g, '')
    const parsed = Number(cleaned)
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}

/**
 * Read first matching numeric field from an FMP quote row (camelCase or snake_case keys).
 *
 * @param row Parsed quote object
 * @param keys Candidate field names in priority order
 * @returns First finite number found or null
 */
function pickNumericField(row: Record<string, unknown>, keys: string[]): number | null {
  for (const key of keys) {
    if (!(key in row)) continue
    const n = toFiniteNumber(row[key])
    if (n != null) return n
  }
  return null
}

/**
 * Normalize FMP /stable/quote JSON to a list of row objects (array, wrapped, or single row).
 *
 * @param parsed Raw JSON body
 * @returns List of quote rows
 */
function normalizeFmpQuoteRows(parsed: unknown): Record<string, unknown>[] {
  if (Array.isArray(parsed)) {
    return parsed.filter((x): x is Record<string, unknown> => x != null && typeof x === 'object' && !Array.isArray(x))
  }
  if (parsed != null && typeof parsed === 'object' && !Array.isArray(parsed)) {
    const o = parsed as Record<string, unknown>
    if (Array.isArray(o.data)) {
      return o.data.filter((x): x is Record<string, unknown> => x != null && typeof x === 'object' && !Array.isArray(x))
    }
    if ('symbol' in o || 'price' in o) return [o]
  }
  return []
}

/**
 * Detect legacy Turso rows where FMP mapping failed but close exists (forces one upstream refresh).
 *
 * @param row Cached summary row
 * @returns True when cache should be bypassed for refresh
 */
function fmpCachedRowMissingChgVolValue(row: StockMarketSummary): boolean {
  if (row.source !== 'fmp') return false
  if (row.close == null) return false
  return row.changePercent == null && row.volumeTraded == null && row.valueTraded == null
}

/**
 * Map one FMP quote row into StockMarketSummary (same numeric fields as TASI summary for overview).
 *
 * @param market Market name
 * @param row Single quote row
 * @returns Summary or null when unusable
 */
function mapFmpQuoteRowToSummary(market: Exclude<StockMarket, 'TASI'>, row: Record<string, unknown>): StockMarketSummary | null {
  const ts = pickNumericField(row, ['timestamp'])
  let date = new Date().toISOString().slice(0, 10)
  if (ts != null) {
    const epochMs = ts > 1e12 ? ts : ts * 1000
    date = new Date(epochMs).toISOString().slice(0, 10)
  }

  const close = pickNumericField(row, ['price', 'last', 'regularMarketPrice', 'regular_market_price'])
  if (close == null) return null

  const open = pickNumericField(row, ['open', 'regularMarketOpen', 'regular_market_open'])
  const high = pickNumericField(row, ['dayHigh', 'day_high', 'high', 'regularMarketDayHigh'])
  const low = pickNumericField(row, ['dayLow', 'day_low', 'low', 'regularMarketDayLow'])
  const change = pickNumericField(row, ['change', 'changes', 'changeAmount'])

  let changePercent = pickNumericField(row, ['changesPercentage', 'changePercentage', 'changes_percentage', 'change_percentage', 'percentageChange', 'percentChange'])
  if (changePercent == null) {
    const prevClose = pickNumericField(row, ['previousClose', 'previous_close', 'prevClose', 'closePrevious', 'regularMarketPreviousClose'])
    if (prevClose != null && prevClose !== 0) {
      changePercent = ((close - prevClose) / prevClose) * 100
    }
  }

  const volume = pickNumericField(row, ['volume', 'avgVolume', 'averageVolume', 'average_volume', 'vol'])
  const valueTraded = volume != null ? close * volume : null

  return {
    market,
    date,
    open,
    high,
    low,
    close,
    change,
    changePercent,
    volumeTraded: volume,
    valueTraded,
    source: 'fmp',
  }
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
 * Fetch one market summary from FMP stable quote endpoint.
 *
 * @param market Non-TASI market
 * @returns Stock summary or null
 */
async function fetchFmpSummary(market: Exclude<StockMarket, 'TASI'>): Promise<StockMarketSummary | null> {
  if (!FMP_SUPPORTED_MARKETS.has(market)) {
    logger.info('fmp market skipped (unsupported in current plan)', { market })
    return null
  }
  const apiKey = process.env.FMP_API_KEY?.trim()
  if (!apiKey) return null
  const symbol = FMP_SYMBOL_BY_MARKET[market]
  const url = `${FMP_BASE_URL}/quote?symbol=${encodeURIComponent(symbol)}&apikey=${encodeURIComponent(apiKey)}`
  const res = await fetch(url, {
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(10_000),
  })
  if (!res.ok) {
    logger.warn('fmp quote request failed', { market, status: res.status })
    return null
  }
  const parsed: unknown = await res.json()
  const rows = normalizeFmpQuoteRows(parsed)
  const row = rows[0]
  if (!row) {
    logger.warn('fmp quote empty rows', { market })
    return null
  }
  const summary = mapFmpQuoteRowToSummary(market, row)
  if (!summary) logger.warn('fmp quote row could not be mapped', { market })
  return summary
}

/**
 * Get summary for one stock market with persistence.
 * Uses daily cache in Turso; refreshes from upstream and upserts when available.
 * Bypasses Turso when an FMP row has close but null changePercent/volumeTraded/valueTraded (legacy bad cache).
 *
 * @param market Market key
 * @returns Latest available summary or null
 */
export async function getStockSummary(market: StockMarket): Promise<StockMarketSummary | null> {
  const cached = await readLatestStockSummary(market)
  if (cached && !fmpCachedRowMissingChgVolValue(cached)) return cached

  const existingRefresh = coldStartRefreshInFlight.get(market)
  if (existingRefresh) return existingRefresh

  const refreshPromise = (async () => {
    try {
      const fresh = market === 'TASI' ? await getTasiSummaryAsStock('TASI') : await fetchFmpSummary(market)
      if (!fresh) return null
      await upsertStockSummaryDaily(fresh)
      logger.info('getStockSummary cold-start refresh success', { market, date: fresh.date })
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
      const fresh = market === 'TASI' ? await getTasiSummaryAsStock('TASI') : await fetchFmpSummary(market)
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
