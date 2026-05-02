import { fetchLatestDailyFromEastmoneySecid } from '@/services/finance/market/daily/fetch'
import type { FinanceMarketDailyRecord } from '@/services/finance/market/daily/types'
import { createLogger } from '@/services/logger'

import type { StockMarket, StockMarketSummary } from './types'

const logger = createLogger('finance-stock-upstream-index')

/** Yahoo Finance chart symbols (used when Eastmoney has no feed or as fallback). */
const YAHOO_SYMBOL_BY_MARKET: Record<Exclude<StockMarket, 'TASI'>, string> = {
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

/**
 * Eastmoney `secid` for global index daily kline (`push2his`); US majors are absent here and use Yahoo only.
 * Aligns with `stock.md` style global codes where applicable (CSI 300 = Shanghai index `1.000300`).
 */
const EASTMONEY_SECID_BY_MARKET: Partial<Record<Exclude<StockMarket, 'TASI'>, string>> = {
  'Hang Seng': '100.HSI',
  'CSI 300': '1.000300',
  'DAX 30': '100.GDAXI',
  'CAC 40': '100.FCHI',
  KOSPI: '100.KS11',
  'Nikkei 225': '100.N225',
  'VN Index': '100.VNINDEX',
}

type YahooChartMeta = {
  regularMarketPrice?: number
  chartPreviousClose?: number
  regularMarketDayHigh?: number
  regularMarketDayLow?: number
  regularMarketOpen?: number
  regularMarketVolume?: number
  regularMarketTime?: number
  exchangeTimezoneName?: string
}

type YahooQuoteBundle = {
  open?: Array<number | null>
  high?: Array<number | null>
  low?: Array<number | null>
  close?: Array<number | null>
  volume?: Array<number | null>
}

/**
 * Format calendar date in a given IANA time zone from Unix seconds.
 *
 * @param epochSec Unix timestamp in seconds
 * @param timeZone IANA zone name (falls back to UTC)
 * @returns `YYYY-MM-DD`
 */
function formatTradingDate(epochSec: number, timeZone: string | undefined): string {
  const tz = timeZone && timeZone.length > 0 ? timeZone : 'UTC'
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(epochSec * 1000))
}

/**
 * Last finite number in a nullable numeric series (Yahoo pads with null).
 *
 * @param series Nullable numeric array
 * @returns Last finite value or null
 */
function lastFiniteNumber(series: Array<number | null | undefined> | undefined): number | null {
  if (!series || series.length === 0) return null
  for (let i = series.length - 1; i >= 0; i -= 1) {
    const v = series[i]
    if (typeof v === 'number' && Number.isFinite(v)) return v
  }
  return null
}

/**
 * Map Yahoo chart v8 JSON into {@link StockMarketSummary}.
 *
 * @param market Stock overview market key
 * @param body Parsed chart JSON
 * @returns Summary or null
 */
export function mapYahooChartJsonToStockSummary(market: Exclude<StockMarket, 'TASI'>, body: unknown): StockMarketSummary | null {
  if (body == null || typeof body !== 'object') return null
  const chart = (body as { chart?: unknown }).chart
  if (chart == null || typeof chart !== 'object') return null
  const c = chart as { error?: unknown; result?: unknown[] }
  if (c.error) return null
  const first = c.result?.[0]
  if (first == null || typeof first !== 'object') return null
  const meta = (first as { meta?: YahooChartMeta }).meta
  const indicators = (first as { indicators?: { quote?: YahooQuoteBundle[] }; timestamp?: number[] }).indicators
  const timestamps = (first as { timestamp?: number[] }).timestamp
  const quote = indicators?.quote?.[0]
  if (!meta) return null

  const close = typeof meta.regularMarketPrice === 'number' && Number.isFinite(meta.regularMarketPrice) ? meta.regularMarketPrice : null
  if (close == null) return null

  const prevClose = typeof meta.chartPreviousClose === 'number' && Number.isFinite(meta.chartPreviousClose) ? meta.chartPreviousClose : null
  const change = prevClose != null ? close - prevClose : null
  const changePercent = prevClose != null && prevClose !== 0 ? ((close - prevClose) / prevClose) * 100 : null

  const open = typeof meta.regularMarketOpen === 'number' && Number.isFinite(meta.regularMarketOpen) ? meta.regularMarketOpen : lastFiniteNumber(quote?.open)
  const high = typeof meta.regularMarketDayHigh === 'number' && Number.isFinite(meta.regularMarketDayHigh) ? meta.regularMarketDayHigh : lastFiniteNumber(quote?.high)
  const low = typeof meta.regularMarketDayLow === 'number' && Number.isFinite(meta.regularMarketDayLow) ? meta.regularMarketDayLow : lastFiniteNumber(quote?.low)

  const volume = typeof meta.regularMarketVolume === 'number' && Number.isFinite(meta.regularMarketVolume) ? meta.regularMarketVolume : lastFiniteNumber(quote?.volume)

  const t =
    typeof meta.regularMarketTime === 'number' && Number.isFinite(meta.regularMarketTime)
      ? meta.regularMarketTime
      : Array.isArray(timestamps) && timestamps.length > 0
        ? timestamps[timestamps.length - 1]
        : Math.floor(Date.now() / 1000)
  const date = formatTradingDate(t, meta.exchangeTimezoneName)

  const valueTraded = volume != null && volume > 0 ? close * volume : null

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
    source: 'yahoo',
  }
}

/**
 * Map one Eastmoney global-index daily row into stock summary.
 *
 * @param market Stock overview market key
 * @param row Parsed daily row
 * @returns Summary
 */
export function mapEastmoneyGlobalIndexRowToStockSummary(market: Exclude<StockMarket, 'TASI'>, row: FinanceMarketDailyRecord): StockMarketSummary {
  const volume = Number.isFinite(row.volume) ? row.volume : null
  const amount = Number.isFinite(row.amount) && row.amount > 0 ? row.amount : null
  const valueTraded = amount ?? (volume != null && volume > 0 && Number.isFinite(row.close) ? row.close * volume : null)
  return {
    market,
    date: row.date,
    open: Number.isFinite(row.open) ? row.open : null,
    high: Number.isFinite(row.high) ? row.high : null,
    low: Number.isFinite(row.low) ? row.low : null,
    close: Number.isFinite(row.close) ? row.close : null,
    change: Number.isFinite(row.changeAmount) ? row.changeAmount : null,
    changePercent: Number.isFinite(row.changeRate) ? row.changeRate : null,
    volumeTraded: volume,
    valueTraded,
    source: 'eastmoney-index',
  }
}

/**
 * Fetch Yahoo chart v8 JSON for a symbol.
 *
 * @param symbol Yahoo symbol (e.g. `^GSPC`)
 * @returns Parsed JSON or null on failure / non-JSON
 */
async function fetchYahooChartJson(symbol: string): Promise<unknown | null> {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=5d`
  const res = await fetch(url, {
    headers: {
      Accept: 'application/json',
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    },
    signal: AbortSignal.timeout(12_000),
  })
  if (!res.ok) {
    logger.warn('yahoo chart request failed', { symbol, status: res.status })
    return null
  }
  const text = await res.text()
  const trimmed = text.trim()
  if (trimmed.startsWith('<') || !trimmed.startsWith('{')) {
    logger.warn('yahoo chart returned non-JSON body', { symbol, head: trimmed.slice(0, 80) })
    return null
  }
  try {
    return JSON.parse(trimmed) as unknown
  } catch {
    logger.warn('yahoo chart JSON parse failed', { symbol })
    return null
  }
}

/**
 * Load latest index snapshot for a non-TASI stock overview market (no FMP): Eastmoney `secid` when
 * configured, then Yahoo chart fallback (US indices use Yahoo only).
 *
 * @param market Non-TASI market from the overview dropdown
 * @returns Summary or null when both providers fail
 */
export async function fetchUpstreamIndexSummary(market: Exclude<StockMarket, 'TASI'>): Promise<StockMarketSummary | null> {
  const secid = EASTMONEY_SECID_BY_MARKET[market]
  if (secid) {
    try {
      const row = await fetchLatestDailyFromEastmoneySecid(secid, secid)
      if (row && Number.isFinite(row.close)) {
        return mapEastmoneyGlobalIndexRowToStockSummary(market, row)
      }
    } catch (error) {
      logger.warn('eastmoney index summary failed', {
        market,
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }

  const yahooSymbol = YAHOO_SYMBOL_BY_MARKET[market]
  const json = await fetchYahooChartJson(yahooSymbol)
  const fromYahoo = mapYahooChartJsonToStockSummary(market, json)
  if (!fromYahoo) logger.warn('yahoo index summary empty', { market, yahooSymbol })
  return fromYahoo
}
