import { createLogger } from '@/services/logger'

import { fetchDailyRangeFromEastmoney, fetchFundNavRangeFromEastmoney, fetchLatestDailyFromEastmoney, fetchLatestFundNavFromEastmoney } from './fetch'
import { isFundNavSixDigitSymbol } from './fundNavSymbols'
import { buildMacdHistogramFromClose, getMacdStreakUpDownFromHistogram } from './macd'
import { readMarketDailyByRange, upsertMarketDailyRecords } from './turso'
import type { FinanceMarketDailyRecord } from './types'

export type { FundNavSixDigitCode } from './fundNavSymbols'
export { FUND_NAV_SIX_DIGIT_CODES, isFundNavSixDigitSymbol } from './fundNavSymbols'
export { toPublicFundNavRecord, toPublicOhlcvRecord } from './publicRecords'
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
