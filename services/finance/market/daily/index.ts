import { createLogger } from '@/services/logger'

import { fetchDailyRangeFromEastmoney, fetchFundNavRangeFromEastmoney, fetchLatestDailyFromEastmoney, fetchLatestFundNavFromEastmoney } from './fetch'
import { isFundNavSixDigitSymbol } from './fundNavSymbols'
import { readMarketDailyByRange, upsertMarketDailyRecords } from './turso'
import type { FinanceMarketDailyRecord } from './types'

export type { FundNavSixDigitCode } from './fundNavSymbols'
export { FUND_NAV_SIX_DIGIT_CODES, isFundNavSixDigitSymbol } from './fundNavSymbols'

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

/**
 * Parse and validate six-digit symbols from comma-separated text.
 *
 * @param symbolsRaw Comma-separated symbols
 * @returns Valid unique symbol list
 */
export function parseSymbols(symbolsRaw: string): string[] {
  const set = new Set<string>()
  for (const chunk of symbolsRaw.split(',')) {
    const symbol = chunk.trim()
    if (/^\d{6}$/.test(symbol)) set.add(symbol)
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
 * Sync latest daily records from Eastmoney for target symbols.
 *
 * @param symbols Symbol list
 * @returns Sync summary
 */
export async function runMarketDailyIngest(symbols: string[]): Promise<{ total: number; written: number }> {
  const validSymbols = symbols.filter((symbol) => /^\d{6}$/.test(symbol))
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
  const validSymbols = options.symbols.filter((symbol) => /^\d{6}$/.test(symbol))
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
 * Calculation follows the stock.md logic (EMA12/EMA26 -> DIF/DEA -> MACD).
 *
 * @param items Daily records
 * @returns Records with optional indicator fields
 */
function attachMacdIndicators(items: FinanceMarketDailyRecord[]): FinanceMarketDailyRecord[] {
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

  for (const [symbol, group] of bySymbol.entries()) {
    const sorted = [...group].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))
    if (sorted.length < 2) continue
    const macdSeries = buildMacdSeries(sorted.map((row) => row.close))
    const counts = getMacdUpDownCounts(macdSeries)
    const latest = sorted[sorted.length - 1]
    latestKeyToIndicator.set(`${symbol}:${latest.date}`, counts)
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

/**
 * Build MACD series from close prices.
 *
 * @param closes Close price sequence
 * @returns MACD value sequence
 */
function buildMacdSeries(closes: number[]): number[] {
  let ema12 = closes[0]
  let ema26 = closes[0]
  let dea = 0
  const alpha12 = 2 / (12 + 1)
  const alpha26 = 2 / (26 + 1)
  const alpha9 = 2 / (9 + 1)
  const out: number[] = []
  for (const close of closes) {
    ema12 = ema12 + alpha12 * (close - ema12)
    ema26 = ema26 + alpha26 * (close - ema26)
    const dif = ema12 - ema26
    dea = dea + alpha9 * (dif - dea)
    out.push((dif - dea) * 2)
  }
  return out
}

/**
 * Count latest MACD up/down streak lengths.
 *
 * @param macdSeries MACD sequence
 * @returns Up/down streak counts
 */
function getMacdUpDownCounts(macdSeries: number[]): { up: number; down: number } {
  let isRise = true
  let up = 0
  let down = 0
  for (let i = macdSeries.length - 1; i >= 1; i -= 1) {
    if (isRise) {
      if (macdSeries[i] > macdSeries[i - 1]) {
        up += 1
      } else {
        isRise = false
        down += 1
      }
    } else if (macdSeries[i] < macdSeries[i - 1]) {
      down += 1
    } else {
      break
    }
  }
  return { up, down }
}
