import { createLogger } from '@/services/logger'

import { fetchDailyRangeFromEastmoney, fetchFundNavRangeFromEastmoney, fetchLatestDailyFromEastmoney, fetchLatestFundNavFromEastmoney } from './fetch'
import { isFundNavSixDigitSymbol } from './fundNavSymbols'
import { buildMacdHistogramFromClose, getMacdStreakUpDownFromHistogram } from './macd'
import { readMarketDailyByRange, upsertMarketDailyRecords } from './turso'
import type { FinanceFundNavDailyRecord, FinanceMarketDailyRecord, FinanceMarketOhlcvDailyRecord } from './types'

export type { FundNavSixDigitCode } from './fundNavSymbols'
export { FUND_NAV_SIX_DIGIT_CODES, isFundNavSixDigitSymbol } from './fundNavSymbols'
import { toPublicFundNavRecord, toPublicOhlcvRecord } from './publicRecords'

export { toPublicFundNavRecord, toPublicOhlcvRecord }
export { fundNavDailySymbolsRejectionMessage, marketDailySymbolsRejectionMessage } from './symbolPolicy'
export { isFundEtfOhlcvSymbolSetAllowedForSync, isFundNavSymbolSetAllowedForSync, isMarketDailyOhlcvSymbolSetAllowedForSync } from './syncAllowlist'
export type { FinanceFundNavDailyRecord, FinanceMarketOhlcvDailyRecord } from './types'

const logger = createLogger('finance-market-daily')

/**
 * Validate YYYY-MM-DD date format.
 *
 * @param value Raw date string
 * @returns Normalized date or null when invalid
 */
export function parseDate(value: string): string | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!m) return null
  const y = Number(m[1])
  const mo = Number(m[2])
  const d = Number(m[3])
  const date = new Date(Date.UTC(y, mo - 1, d))
  if (date.getUTCFullYear() !== y || date.getUTCMonth() !== mo - 1 || date.getUTCDate() !== d) return null
  return value
}

/** Non–six-digit symbols accepted on OHLCV market routes (uppercase canonical). */
const MARKET_DAILY_EXTRA_SYMBOLS = new Set<string>(['XAUUSD'])

/**
 * Parse and validate symbols from comma-separated text: six-digit codes plus allowlisted tickers (e.g. **XAUUSD**).
 *
 * @param symbolsRaw Comma-separated symbols
 * @returns Valid unique symbol list
 */
export function parseSymbols(symbolsRaw: string): string[] {
  const set = new Set<string>()
  for (const chunk of symbolsRaw.split(',')) {
    const raw = chunk.trim()
    if (/^\d{6}$/.test(raw)) {
      set.add(raw)
      continue
    }
    const upper = raw.toUpperCase()
    if (MARKET_DAILY_EXTRA_SYMBOLS.has(upper)) set.add(upper)
  }
  return [...set]
}

/**
 * Read persisted market daily records by symbols and date range.
 *
 * @param options Query options
 * @returns Ordered daily records
 */
export async function getMarketDaily(options: { symbolsRaw: string; startDate: string; endDate: string; withIndicators?: boolean }): Promise<FinanceMarketDailyRecord[]> {
  const symbols = parseSymbols(options.symbolsRaw)
  const startDate = parseDate(options.startDate)
  const endDate = parseDate(options.endDate)
  if (symbols.length === 0 || !startDate || !endDate || startDate > endDate) return []
  const items = await readMarketDailyByRange(symbols, startDate, endDate)
  if (!options.withIndicators) return items
  return attachMacdIndicators(items)
}

/**
 * Read market daily rows; optionally run range ingest when the first read is empty (caller must vet symbols).
 *
 * @param options Query + optional sync
 * @returns Rows and whether an on-demand ingest ran before the final read
 */
export async function getMarketDailyWithOptionalSync(options: {
  symbolsRaw: string
  startDate: string
  endDate: string
  withIndicators?: boolean
  syncIfEmpty?: boolean
  /** When false, `syncIfEmpty` is ignored (prevents arbitrary symbol backfill). */
  allowOnDemandIngest?: boolean
}): Promise<{ items: FinanceMarketDailyRecord[]; synced: boolean }> {
  const withIndicators = options.withIndicators ?? false
  let items = await getMarketDaily({
    symbolsRaw: options.symbolsRaw,
    startDate: options.startDate,
    endDate: options.endDate,
    withIndicators,
  })
  let synced = false
  if (options.syncIfEmpty && items.length === 0 && options.allowOnDemandIngest) {
    const symbols = parseSymbols(options.symbolsRaw)
    const sd = parseDate(options.startDate)
    const ed = parseDate(options.endDate)
    if (symbols.length > 0 && sd && ed && sd <= ed) {
      await runMarketDailyIngestRange({ symbols, startDate: sd, endDate: ed })
      items = await getMarketDaily({
        symbolsRaw: options.symbolsRaw,
        startDate: options.startDate,
        endDate: options.endDate,
        withIndicators,
      })
      synced = true
    }
  }
  return { items, synced }
}

/** UTC lookback for resolving latest OHLCV bar and optional MACD streaks. */
const LATEST_OHLCV_LOOKBACK_DAYS = 140

/**
 * Format a Date as YYYY-MM-DD in UTC.
 *
 * @param d Instant
 * @returns Calendar date string
 */
function formatUtcYmd(d: Date): string {
  const y = d.getUTCFullYear()
  const m = String(d.getUTCMonth() + 1).padStart(2, '0')
  const day = String(d.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/**
 * Add calendar days to a YYYY-MM-DD string in UTC.
 *
 * @param ymd Start date
 * @param delta Day delta (may be negative)
 * @returns Resulting YYYY-MM-DD
 */
function addUtcCalendarDays(ymd: string, delta: number): string {
  const [y, mo, d] = ymd.split('-').map((x) => Number(x))
  const dt = new Date(Date.UTC(y, mo - 1, d + delta))
  return formatUtcYmd(dt)
}

/**
 * Keep the newest calendar row per symbol (lexicographic YYYY-MM-DD compare).
 *
 * @param rows Daily rows
 * @returns One row per symbol, sorted by symbol
 */
function pickLatestPerSymbol(rows: FinanceMarketDailyRecord[]): FinanceMarketDailyRecord[] {
  const map = new Map<string, FinanceMarketDailyRecord>()
  for (const row of rows) {
    const cur = map.get(row.symbol)
    if (!cur || row.date > cur.date) map.set(row.symbol, row)
  }
  return [...map.values()].sort((a, b) => a.symbol.localeCompare(b.symbol))
}

/**
 * Exclude fund NAV rows from a mixed Turso read.
 *
 * @param rows Raw rows
 * @returns Exchange OHLCV / precious rows only
 */
function filterOhlcvRows(rows: FinanceMarketDailyRecord[]): FinanceMarketDailyRecord[] {
  return rows.filter((r) => r.source !== 'eastmoney-fund-nav')
}

/**
 * Keep LSJZ-backed NAV rows only.
 *
 * @param rows Raw rows
 * @returns Fund NAV rows only
 */
function filterNavRows(rows: FinanceMarketDailyRecord[]): FinanceMarketDailyRecord[] {
  return rows.filter((r) => r.source === 'eastmoney-fund-nav')
}

/**
 * Latest exchange-traded daily bar per symbol (most recent session in Turso or from Eastmoney tail when syncing).
 *
 * @param options symbolsRaw, optional withIndicators, syncIfEmpty (defaults true), allowOnDemandIngest
 * @returns Response time, one public OHLCV row per symbol, and whether a fetch+upsert ran
 */
export async function getMarketOhlcvLatestDaily(options: {
  symbolsRaw: string
  withIndicators?: boolean
  syncIfEmpty?: boolean
  allowOnDemandIngest?: boolean
}): Promise<{ asOf: string; items: FinanceMarketOhlcvDailyRecord[]; synced: boolean }> {
  const asOf = new Date().toISOString()
  const symbols = parseSymbols(options.symbolsRaw)
  if (symbols.length === 0) {
    return { asOf, items: [], synced: false }
  }
  const syncIfEmpty = options.syncIfEmpty !== false
  const withIndicators = options.withIndicators ?? false
  const endDate = formatUtcYmd(new Date())
  const startDate = addUtcCalendarDays(endDate, -LATEST_OHLCV_LOOKBACK_DAYS)

  let internal = filterOhlcvRows(
    await getMarketDaily({
      symbolsRaw: options.symbolsRaw,
      startDate,
      endDate,
      withIndicators,
    })
  )
  let picks = pickLatestPerSymbol(internal)
  let synced = false

  if (syncIfEmpty && options.allowOnDemandIngest) {
    const missing = symbols.filter((s) => !picks.some((p) => p.symbol === s))
    if (missing.length > 0) {
      const fetched = await Promise.all(missing.map((symbol) => fetchLatestDailyFromEastmoney(symbol)))
      const toWrite = fetched.filter((row): row is FinanceMarketDailyRecord => row != null)
      if (toWrite.length > 0) {
        await upsertMarketDailyRecords(toWrite)
        synced = true
        internal = filterOhlcvRows(
          await getMarketDaily({
            symbolsRaw: options.symbolsRaw,
            startDate,
            endDate,
            withIndicators,
          })
        )
        picks = pickLatestPerSymbol(internal)
      }
    }
  }

  const publicItems = picks.map(toPublicOhlcvRecord).filter((row): row is FinanceMarketOhlcvDailyRecord => row != null)
  return { asOf, items: publicItems, synced }
}

/**
 * Latest fund NAV disclosure row per symbol (newest LSJZ page head when syncing).
 *
 * @param options symbolsRaw, syncIfEmpty (defaults true), allowOnDemandIngest
 * @returns Response time, one public NAV row per symbol, and whether a fetch+upsert ran
 */
export async function getFundNavLatestDaily(options: {
  symbolsRaw: string
  syncIfEmpty?: boolean
  allowOnDemandIngest?: boolean
}): Promise<{ asOf: string; items: FinanceFundNavDailyRecord[]; synced: boolean }> {
  const asOf = new Date().toISOString()
  const symbols = parseSymbols(options.symbolsRaw)
  if (symbols.length === 0) {
    return { asOf, items: [], synced: false }
  }
  const syncIfEmpty = options.syncIfEmpty !== false
  const endDate = formatUtcYmd(new Date())
  const startDate = addUtcCalendarDays(endDate, -LATEST_OHLCV_LOOKBACK_DAYS)

  let internal = filterNavRows(
    await getMarketDaily({
      symbolsRaw: options.symbolsRaw,
      startDate,
      endDate,
      withIndicators: false,
    })
  )
  let picks = pickLatestPerSymbol(internal)
  let synced = false

  if (syncIfEmpty && options.allowOnDemandIngest) {
    const missing = symbols.filter((s) => !picks.some((p) => p.symbol === s))
    if (missing.length > 0) {
      const fetched = await Promise.all(missing.map((symbol) => fetchLatestFundNavFromEastmoney(symbol)))
      const toWrite = fetched.filter((row): row is FinanceMarketDailyRecord => row != null)
      if (toWrite.length > 0) {
        await upsertMarketDailyRecords(toWrite)
        synced = true
        internal = filterNavRows(
          await getMarketDaily({
            symbolsRaw: options.symbolsRaw,
            startDate,
            endDate,
            withIndicators: false,
          })
        )
        picks = pickLatestPerSymbol(internal)
      }
    }
  }

  const publicItems = picks.map(toPublicFundNavRecord).filter((row): row is FinanceFundNavDailyRecord => row != null)
  return { asOf, items: publicItems, synced }
}

/**
 * Sync latest daily records from Eastmoney for target symbols.
 *
 * @param symbols Symbol list
 * @returns Sync summary
 */
function isValidMarketDailyIngestSymbol(symbol: string): boolean {
  return /^\d{6}$/.test(symbol) || symbol === 'XAUUSD'
}

/**
 * @param symbols Raw symbol strings (may include spaces)
 */
export async function runMarketDailyIngest(symbols: string[]): Promise<{ total: number; written: number }> {
  const validSymbols = symbols.map((s) => s.trim()).filter(isValidMarketDailyIngestSymbol)
  if (validSymbols.length === 0) return { total: 0, written: 0 }
  const results = await Promise.all(
    validSymbols.map((symbol) => (isFundNavSixDigitSymbol(symbol) ? fetchLatestFundNavFromEastmoney(symbol) : fetchLatestDailyFromEastmoney(symbol)))
  )
  const records = results.filter((record): record is FinanceMarketDailyRecord => record != null)
  if (records.length > 0) {
    await upsertMarketDailyRecords(records)
  }
  logger.info('runMarketDailyIngest done', { total: validSymbols.length, written: records.length })
  return { total: validSymbols.length, written: records.length }
}

/**
 * Ingest a date range by pulling a larger tail from Eastmoney, then filtering by date.
 *
 * @param options Ingest options
 * @returns Sync summary
 */
export async function runMarketDailyIngestRange(options: { symbols: string[]; startDate: string; endDate: string }): Promise<{ total: number; written: number }> {
  const startDate = parseDate(options.startDate)
  const endDate = parseDate(options.endDate)
  const validSymbols = options.symbols.filter(isValidMarketDailyIngestSymbol)
  if (!startDate || !endDate || startDate > endDate || validSymbols.length === 0) {
    return { total: 0, written: 0 }
  }
  const dayMs = 86400000
  const diffDays = Math.max(1, Math.floor((new Date(endDate).getTime() - new Date(startDate).getTime()) / dayMs) + 1)
  const limit = Math.min(diffDays + 30, 800)
  const endCompact = endDate.replace(/-/g, '')
  const allRecords: FinanceMarketDailyRecord[] = []
  for (const symbol of validSymbols) {
    const rows = isFundNavSixDigitSymbol(symbol)
      ? await fetchFundNavRangeFromEastmoney(symbol, { startDate, endDate })
      : await fetchDailyRangeFromEastmoney(symbol, {
          endDate: endCompact,
          limit,
        })
    for (const row of rows) {
      if (row.date >= startDate && row.date <= endDate) {
        allRecords.push(row)
      }
    }
  }
  if (allRecords.length > 0) {
    await upsertMarketDailyRecords(allRecords)
  }
  logger.info('runMarketDailyIngestRange done', {
    total: validSymbols.length,
    written: allRecords.length,
    startDate,
    endDate,
  })
  return { total: validSymbols.length, written: allRecords.length }
}

/**
 * Attach MACD up/down counts to the latest record of each symbol in result set.
 * Uses pandas-equivalent EWM (`stock.md` calculate_macd / get_macd) via {@link buildMacdHistogramFromClose}.
 *
 * @param items Daily records
 * @returns Records with optional indicator fields
 */
export function attachMacdIndicators(items: FinanceMarketDailyRecord[]): FinanceMarketDailyRecord[] {
  const bySymbol = new Map<string, FinanceMarketDailyRecord[]>()
  for (const item of items) {
    const group = bySymbol.get(item.symbol) ?? []
    group.push(item)
    bySymbol.set(item.symbol, group)
  }

  const enriched: FinanceMarketDailyRecord[] = items.map((item) => ({
    ...item,
    macdUp: null as number | null,
    macdDown: null as number | null,
  }))
  const latestKeyToIndicator = new Map<string, { up: number; down: number }>()

  for (const [, group] of bySymbol.entries()) {
    const sorted = [...group].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))
    if (sorted.length < 2) continue
    const macdSeries = buildMacdHistogramFromClose(sorted.map((row) => row.close))
    const counts = getMacdStreakUpDownFromHistogram(macdSeries)
    const latest = sorted[sorted.length - 1]
    latestKeyToIndicator.set(`${latest.symbol}:${latest.date}`, counts)
  }

  for (const row of enriched) {
    const indicator = latestKeyToIndicator.get(`${row.symbol}:${row.date}`)
    if (indicator) {
      row.macdUp = indicator.up
      row.macdDown = indicator.down
    }
  }
  return enriched
}
