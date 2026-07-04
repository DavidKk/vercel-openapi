/**
 * Finance (TASI): read today snapshot from KV (if not expired) or remote; DB is backup only. See services/finance/tasi/README.md.
 */

import { createLogger } from '@/services/logger'

import { TASI_COMPANY_DAILY_ENABLED, TASI_MAX_RANGE_DAYS } from './constants'
import { fetchSummaryFromSahmk } from './fetch'
import { getTasiDailySnapshotFromKv, isTasiDailySnapshotExpired, saveTasiDailySnapshotToKv, type TasiDailySnapshot } from './snapshot'
import { deleteOlderThanRetention, readCompanyDailyByDate, readCompanyKline, readSummaryByDate, readSummaryKline, writeCompanyDaily, writeSummary } from './turso'
import type { TasiCompanyDailyRecord, TasiMarketSummary } from './types'

const logger = createLogger('finance-tasi')

/** Dedupe parallel summary refresh calls (read path + cron). */
let summaryRefreshPromise: Promise<TasiMarketSummary> | null = null

export { TASI_COMPANY_DAILY_ENABLED, TASI_MAX_RANGE_DAYS } from './constants'
export type { TasiCompanyDailyRecord, TasiMarketSummary } from './types'

/**
 * When company daily list is disabled, return an API error message for latest/list requests (K-line and historical dates still allowed).
 * @param options Request query options
 * @returns Error message or null when the request is allowed
 */
export function tasiCompanyDailyListError(options: { date?: string; code?: string; from?: string; to?: string }): string | null {
  if (TASI_COMPANY_DAILY_ENABLED) return null
  if (options.code != null && options.from != null && options.to != null) return null
  if (options.date != null && options.date !== getTodayUtc()) return null
  return 'Company-level daily list is not supported for TASI (index summary only). Use GET /api/finance/stock/summary?market=TASI or MCP get_stock_summary.'
}

/** Today in YYYY-MM-DD (UTC). */
export function getTodayUtc(): string {
  const d = new Date()
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`
}

/** Parse YYYY-MM-DD and validate. Returns null if invalid. */
export function parseDate(s: string): string | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s)
  if (!m) return null
  const y = parseInt(m[1], 10)
  const mo = parseInt(m[2], 10)
  const day = parseInt(m[3], 10)
  if (mo < 1 || mo > 12 || day < 1 || day > 31) return null
  const date = new Date(Date.UTC(y, mo - 1, day))
  if (date.getUTCFullYear() !== y || date.getUTCMonth() !== mo - 1 || date.getUTCDate() !== day) return null
  return s
}

/** Clamp date range to max days. */
function clampRange(from: string, to: string, maxDays: number): { from: string; to: string } {
  const a = new Date(from)
  const b = new Date(to)
  const diff = Math.round((b.getTime() - a.getTime()) / 86400000)
  if (diff <= maxDays) return { from, to }
  const end = new Date(a)
  end.setUTCDate(end.getUTCDate() + maxDays)
  const toStr = end.toISOString().slice(0, 10)
  return { from, to: toStr }
}

/**
 * Get company daily: for today use KV snapshot (if not expired); else from Turso or K-line. Remote company ingest is deferred (SAHMK Starter+).
 *
 * @param options date (single day), or code+from+to (K-line)
 * @returns Company records or []
 */
export async function getCompanyDaily(options: { date?: string; code?: string; from?: string; to?: string }): Promise<TasiCompanyDailyRecord[]> {
  const today = getTodayUtc()

  if (options.code != null && options.from != null && options.to != null) {
    const from = parseDate(options.from)
    const to = parseDate(options.to)
    if (!from || !to || from > to) return []
    const { from: f, to: t } = clampRange(from, to, TASI_MAX_RANGE_DAYS)
    return readCompanyKline(options.code, f, t)
  }

  if (options.date != null) {
    const d = parseDate(options.date)
    if (!d) return []
    if (d === today) {
      return getCompanyDailyToday()
    }
    return readCompanyDailyByDate(d)
  }

  return getCompanyDailyToday()
}

/** Latest trading day list: disabled like FMP index markets; historical Turso/K-line unchanged. */
async function getCompanyDailyToday(): Promise<TasiCompanyDailyRecord[]> {
  if (!TASI_COMPANY_DAILY_ENABLED) {
    logger.info('company daily: list not supported (summary-only mode)')
    return []
  }
  const cached = await getTasiDailySnapshotFromKv()
  if (cached && !isTasiDailySnapshotExpired(cached) && Array.isArray(cached.company) && cached.company.length > 0) {
    logger.info('company daily: cache hit KV', { snapshotDate: cached.date, count: cached.company.length })
    return cached.company
  }
  logger.info('company daily: skipped remote fetch (company ingest deferred; use cached KV or historical Turso)')
  return []
}

/**
 * Get market summary: for today use KV snapshot (if not expired) → remote; else from Turso or K-line. DB not used for today read.
 *
 * @param options date (single day), or from+to (K-line)
 * @returns Summary or array of summaries, or null/[]
 */
export async function getSummaryDaily(options: { date?: string; from?: string; to?: string }): Promise<TasiMarketSummary | TasiMarketSummary[] | null> {
  const today = getTodayUtc()

  if (options.from != null && options.to != null) {
    const from = parseDate(options.from)
    const to = parseDate(options.to)
    if (!from || !to || from > to) return []
    const { from: f, to: t } = clampRange(from, to, TASI_MAX_RANGE_DAYS)
    return readSummaryKline(f, t)
  }

  if (options.date != null) {
    const d = parseDate(options.date)
    if (!d) return null
    if (d === today) {
      return getSummaryDailyToday()
    }
    return readSummaryByDate(d)
  }

  return getSummaryDailyToday()
}

/** Latest trading day: use KV snapshot if not expired (by TTL), else fetch summary only from SAHMK. */
async function getSummaryDailyToday(): Promise<TasiMarketSummary | null> {
  const cached = await getTasiDailySnapshotFromKv()
  if (cached && !isTasiDailySnapshotExpired(cached) && cached.summary != null) {
    logger.info('summary daily: cache hit KV', { snapshotDate: cached.date })
    return cached.summary
  }
  logger.info('summary daily: cache miss, fetching summary from SAHMK')
  return getSummaryFromRemoteAndPersist()
}

/**
 * Fetch summary from SAHMK and apply write rules. Does not fetch company quotes.
 * @returns Market summary for the latest session
 */
async function getSummaryFromRemoteAndPersist(): Promise<TasiMarketSummary> {
  if (summaryRefreshPromise) return summaryRefreshPromise
  const promise = (async () => {
    try {
      const summary = await fetchSummaryFromSahmk()
      await applyFreshSummary(summary)
      return summary
    } finally {
      summaryRefreshPromise = null
    }
  })()
  summaryRefreshPromise = promise
  return promise
}

/**
 * Merge fresh summary into KV/Turso. Preserves existing company rows on the same trading date when present.
 * @param summary Fresh market summary from SAHMK
 */
async function applyFreshSummary(summary: TasiMarketSummary): Promise<void> {
  const date = summary.date
  if (!date) {
    throw new Error('SAHMK summary missing trading date')
  }

  const prev = await getTasiDailySnapshotFromKv()
  const snapshot: TasiDailySnapshot = {
    date,
    company: prev?.date === date && Array.isArray(prev.company) ? prev.company : [],
    summary: { ...summary, date },
  }

  if (prev && prev.date === date) {
    logger.info('applyFreshSummary: same date, KV only', { date })
    await saveTasiDailySnapshotToKv(snapshot)
    return
  }

  logger.info('applyFreshSummary: new date, DB then KV', { date, companyCount: snapshot.company.length })
  const dbWritePromise = (async () => {
    await writeSummary(date, snapshot.summary)
    if (snapshot.company.length > 0) {
      await writeCompanyDaily(date, snapshot.company)
    }
    await deleteOlderThanRetention()
  })()
  await Promise.all([dbWritePromise, saveTasiDailySnapshotToKv(snapshot)])
}

/**
 * Cron ingest: fetch summary from SAHMK, then apply write rules. Company ingest deferred until SAHMK Starter+ bulk quotes.
 *
 * @returns { written: boolean, date: string }
 */
export async function runIngest(): Promise<{ written: boolean; date: string }> {
  logger.info('ingest: fetch summary from SAHMK')
  const summary = await getSummaryFromRemoteAndPersist()
  const date = summary.date
  if (!date) {
    throw new Error('SAHMK summary missing trading date')
  }
  logger.info('ingest: done', { date })
  return { written: true, date }
}
