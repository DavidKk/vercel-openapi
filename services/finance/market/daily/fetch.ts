import { createLogger } from '@/services/logger'

import type { FinanceMarketDailyRecord } from './types'

const logger = createLogger('finance-market-daily-fetch')

/** Eastmoney kline endpoint in Base64 form. */
const EASTMONEY_KLINE_BASE64 = 'aHR0cHM6Ly9wdXNoMmhpcy5lYXN0bW9uZXkuY29tL2FwaS9xdC9zdG9jay9rbGluZS9nZXQ='
/** Eastmoney fund LSJZ (historical NAV) endpoint in Base64 form. */
const EASTMONEY_FUND_LSJZ_BASE64 = 'aHR0cHM6Ly9hcGkuZnVuZC5lYXN0bW9uZXkuY29tL2YxMC9sc2p6'
/** Eastmoney referer in Base64 form. */
const EASTMONEY_REFERER_BASE64 = 'aHR0cHM6Ly9xdW90ZS5lYXN0bW9uZXkuY29tLw=='
/** Eastmoney fund F10 referer in Base64 form (required by LSJZ API). */
const EASTMONEY_FUND_REFERER_BASE64 = 'aHR0cHM6Ly9mdW5kZjEwLmVhc3Rtb25leS5jb20v'
/** User-Agent used in Python reference implementation. */
const EASTMONEY_UA = 'Mozilla/5.0'
/** Default page size for fund LSJZ (API typically caps at 20). */
const FUND_LSJZ_PAGE_SIZE = 20

/**
 * Decode a Base64-encoded URL.
 *
 * @param encoded Base64-encoded URL string
 * @returns Decoded URL string
 */
export function decodeBase64Url(encoded: string): string {
  return Buffer.from(encoded, 'base64').toString('utf-8')
}

/**
 * Build Eastmoney secid from a six-digit symbol.
 * Rule aligns with common Eastmoney conventions:
 * - SH: symbols starting with 5/6/9 => "1.{symbol}"
 * - SZ: otherwise => "0.{symbol}"
 *
 * @param symbol Six-digit market symbol
 * @returns Eastmoney secid
 */
export function buildEastmoneySecid(symbol: string): string {
  if (/^[569]\d{5}$/.test(symbol)) return `1.${symbol}`
  return `0.${symbol}`
}

/** Eastmoney unified `secid` for spot gold vs USD (`push2his` stock/kline; name 黄金/美元). */
export const EASTMONEY_XAUUSD_SECID = '122.XAU'

/**
 * Resolve `secid` for Eastmoney historical kline (`/api/qt/stock/kline/get`).
 * Six-digit symbols use SH/SZ market prefix rules; **XAUUSD** maps to {@link EASTMONEY_XAUUSD_SECID}.
 *
 * @param symbol Six-digit code or `XAUUSD`
 * @returns `secid` query value
 */
export function resolveEastmoneySecidForKline(symbol: string): string {
  if (symbol === 'XAUUSD') return EASTMONEY_XAUUSD_SECID
  return buildEastmoneySecid(symbol)
}

/**
 * Parse Eastmoney kline row into canonical daily record.
 *
 * @param symbol Six-digit market symbol
 * @param line Raw comma-separated kline row
 * @returns Parsed record or null when malformed
 */
export function parseEastmoneyKline(symbol: string, line: string): FinanceMarketDailyRecord | null {
  const cells = line.split(',')
  if (cells.length < 11) return null
  const [date, open, close, high, low, volume, amount, amplitude, changeRate, changeAmount, turnoverRate] = cells
  const parsed: FinanceMarketDailyRecord = {
    date,
    symbol,
    open: Number(open),
    close: Number(close),
    high: Number(high),
    low: Number(low),
    volume: Number(volume),
    amount: Number(amount),
    amplitude: Number(amplitude),
    changeRate: Number(changeRate),
    changeAmount: Number(changeAmount),
    turnoverRate: Number(turnoverRate),
    source: 'eastmoney',
    isPlaceholder: Number(volume) === 0 || (Number(amplitude) === 0 && Number(amount) === 0),
  }
  if (!parsed.date || Number.isNaN(parsed.open) || Number.isNaN(parsed.close)) return null
  return parsed
}

/**
 * Fetch latest daily kline (klt=101, lmt=1) from Eastmoney.
 * Parameters and headers intentionally match Python reference behavior.
 *
 * @param symbol Six-digit market symbol
 * @returns Latest daily record or null when unavailable
 */
export async function fetchLatestDailyFromEastmoney(symbol: string): Promise<FinanceMarketDailyRecord | null> {
  const records = await fetchDailyRangeFromEastmoney(symbol, {
    endDate: undefined,
    limit: 1,
  })
  return records[0] ?? null
}

/**
 * Fetch daily kline rows from Eastmoney and return normalized records.
 * When endDate is omitted, it defaults to today (UTC) in YYYYMMDD.
 *
 * @param symbol Six-digit market symbol
 * @param options Range options
 * @returns Parsed daily records
 */
export async function fetchDailyRangeFromEastmoney(
  symbol: string,
  options: {
    endDate?: string
    limit: number
  }
): Promise<FinanceMarketDailyRecord[]> {
  const base = decodeBase64Url(EASTMONEY_KLINE_BASE64)
  const referer = decodeBase64Url(EASTMONEY_REFERER_BASE64)
  const today = new Date()
  const defaultEnd = `${today.getUTCFullYear()}${String(today.getUTCMonth() + 1).padStart(2, '0')}${String(today.getUTCDate()).padStart(2, '0')}`
  const params = new URLSearchParams({
    secid: resolveEastmoneySecidForKline(symbol),
    fields1: 'f1,f2,f3,f4,f5',
    fields2: 'f51,f52,f53,f54,f55,f56,f57,f58,f59,f60,f61',
    klt: '101',
    fqt: '1',
    end: options.endDate ?? defaultEnd,
    lmt: String(options.limit),
  })
  const url = `${base}?${params.toString()}`
  logger.info('fetch eastmoney latest daily', { symbol })
  const response = await fetch(url, {
    headers: {
      'User-Agent': EASTMONEY_UA,
      Referer: referer,
    },
    signal: AbortSignal.timeout(10_000),
  })
  if (!response.ok) {
    logger.warn('eastmoney fetch failed', { symbol, status: response.status })
    return []
  }
  const body = (await response.json()) as { data?: { klines?: string[] } }
  const lines = body?.data?.klines ?? []
  const records: FinanceMarketDailyRecord[] = []
  for (const line of lines) {
    const parsed = parseEastmoneyKline(symbol, line)
    if (!parsed) continue
    parsed.source = symbol === 'XAUUSD' ? 'eastmoney-precious-spot' : 'eastmoney'
    records.push(parsed)
  }
  return records
}

/** Single row from Eastmoney fund LSJZ JSON */
type EastmoneyFundLsjzRow = {
  FSRQ?: string
  DWJZ?: string
  JZZZL?: string
}

/**
 * Parse one Eastmoney fund LSJZ row into the shared daily record shape (NAV as OHLC).
 *
 * @param symbol Six-digit fund code
 * @param row Raw LSJZ list item
 * @returns Parsed record or null when malformed
 */
export function parseEastmoneyFundNavLsjzItem(symbol: string, row: EastmoneyFundLsjzRow): FinanceMarketDailyRecord | null {
  const date = row.FSRQ?.trim()
  const navRaw = row.DWJZ?.trim()
  if (!date || !navRaw) return null
  const close = Number(navRaw)
  if (Number.isNaN(close)) return null
  const jzzzl = row.JZZZL?.trim() ?? ''
  const changeRate = jzzzl === '' ? 0 : Number(jzzzl.replace(/%/g, ''))
  if (Number.isNaN(changeRate)) return null
  return {
    date,
    symbol,
    open: close,
    high: close,
    low: close,
    close,
    volume: 0,
    amount: 0,
    amplitude: 0,
    changeRate,
    changeAmount: 0,
    turnoverRate: 0,
    source: 'eastmoney-fund-nav',
    isPlaceholder: false,
  }
}

/**
 * Fetch one page of fund historical NAV from Eastmoney LSJZ.
 *
 * @param symbol Six-digit fund code
 * @param options Page index, size, and optional YYYY-MM-DD bounds (empty strings = full history window)
 * @returns Parsed JSON slice or empty list on error
 */
async function fetchFundNavLsjzPage(
  symbol: string,
  options: { pageIndex: number; pageSize: number; startDate: string; endDate: string }
): Promise<{
  errCode: number
  list: EastmoneyFundLsjzRow[]
  totalCount: number
  pageSize: number
}> {
  const base = decodeBase64Url(EASTMONEY_FUND_LSJZ_BASE64)
  const referer = decodeBase64Url(EASTMONEY_FUND_REFERER_BASE64)
  const params = new URLSearchParams({
    fundCode: symbol,
    pageIndex: String(options.pageIndex),
    pageSize: String(options.pageSize),
    startDate: options.startDate,
    endDate: options.endDate,
  })
  const url = `${base}?${params.toString()}`
  logger.info('fetch eastmoney fund lsjz page', { symbol, pageIndex: options.pageIndex })
  const response = await fetch(url, {
    headers: {
      'User-Agent': EASTMONEY_UA,
      Referer: referer,
    },
    signal: AbortSignal.timeout(10_000),
  })
  if (!response.ok) {
    logger.warn('eastmoney fund lsjz fetch failed', { symbol, status: response.status })
    return { errCode: -1, list: [], totalCount: 0, pageSize: options.pageSize }
  }
  const body = (await response.json()) as {
    ErrCode?: number
    Data?: { LSJZList?: EastmoneyFundLsjzRow[] }
    TotalCount?: number
    PageSize?: number
  }
  const errCode = body.ErrCode ?? 0
  if (errCode !== 0) {
    logger.warn('eastmoney fund lsjz err', { symbol, errCode })
    return { errCode, list: [], totalCount: 0, pageSize: options.pageSize }
  }
  const list = body.Data?.LSJZList ?? []
  const totalCount = typeof body.TotalCount === 'number' ? body.TotalCount : list.length
  const pageSize = typeof body.PageSize === 'number' ? body.PageSize : options.pageSize
  return { errCode: 0, list, totalCount, pageSize }
}

/**
 * Fetch the latest fund NAV row from Eastmoney LSJZ (newest first).
 *
 * @param symbol Six-digit fund code
 * @returns Latest daily record or null when unavailable
 */
export async function fetchLatestFundNavFromEastmoney(symbol: string): Promise<FinanceMarketDailyRecord | null> {
  const page = await fetchFundNavLsjzPage(symbol, {
    pageIndex: 1,
    pageSize: 1,
    startDate: '',
    endDate: '',
  })
  const first = page.list[0]
  if (!first) return null
  return parseEastmoneyFundNavLsjzItem(symbol, first)
}

/**
 * Fetch fund NAV rows in a YYYY-MM-DD range from Eastmoney LSJZ (paginates by TotalCount).
 *
 * @param symbol Six-digit fund code
 * @param options Inclusive start and end calendar dates
 * @returns Parsed daily records within the range, newest-first order preserved
 */
export async function fetchFundNavRangeFromEastmoney(symbol: string, options: { startDate: string; endDate: string }): Promise<FinanceMarketDailyRecord[]> {
  const { startDate, endDate } = options
  if (!startDate || !endDate || startDate > endDate) return []

  const first = await fetchFundNavLsjzPage(symbol, {
    pageIndex: 1,
    pageSize: FUND_LSJZ_PAGE_SIZE,
    startDate,
    endDate,
  })
  if (first.errCode !== 0 || first.totalCount === 0) return []

  const pageSize = Math.max(1, first.pageSize)
  const pageCount = Math.max(1, Math.ceil(first.totalCount / pageSize))
  /** Guard against API anomalies */
  const maxPages = Math.min(pageCount, 2000)

  const records: FinanceMarketDailyRecord[] = []
  const pushPage = (list: EastmoneyFundLsjzRow[]) => {
    for (const row of list) {
      const parsed = parseEastmoneyFundNavLsjzItem(symbol, row)
      if (parsed && parsed.date >= startDate && parsed.date <= endDate) records.push(parsed)
    }
  }

  pushPage(first.list)

  for (let pageIndex = 2; pageIndex <= maxPages; pageIndex += 1) {
    const page = await fetchFundNavLsjzPage(symbol, {
      pageIndex,
      pageSize: FUND_LSJZ_PAGE_SIZE,
      startDate,
      endDate,
    })
    if (page.errCode !== 0 || page.list.length === 0) break
    pushPage(page.list)
  }

  return records
}
