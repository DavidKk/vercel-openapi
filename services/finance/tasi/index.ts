/**
 * Finance (TASI): read today snapshot from KV (if not expired) or remote; DB is backup only. See services/finance/tasi/README.md.
 */

import { createLogger } from '@/services/logger'

import { TASI_MAX_RANGE_DAYS } from './constants'
import { fetchCompanyDailyFromBridge, fetchSummaryFromBridge } from './fetch'
import { getTasiDailySnapshotFromKv, isTasiDailySnapshotExpired, saveTasiDailySnapshotToKv } from './snapshot'
import { deleteOlderThanRetention, readCompanyDailyByDate, readCompanyKline, readSummaryByDate, readSummaryKline, writeCompanyDaily, writeSummary } from './turso'
import type { TasiCompanyDailyRecord, TasiMarketSummary } from './types'

const logger = createLogger('finance-tasi')

/** Dedupe: one in-flight "fetch today + persist" so parallel getCompany/getSummary share it. */
let todayRefreshPromise: Promise<{ date: string; company: TasiCompanyDailyRecord[]; summary: TasiMarketSummary }> | null = null

export { TASI_MAX_RANGE_DAYS } from './constants'
export type { TasiCompanyDailyRecord, TasiMarketSummary } from './types'

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
 * Get company daily: for today use KV snapshot (if not expired) → remote; else from Turso or K-line. DB not used for today read.
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

/** Latest trading day: use KV snapshot if not expired (by TTL), else fetch from remote. No date match — data is previous trading day. */
async function getCompanyDailyToday(): Promise<TasiCompanyDailyRecord[]> {
  const cached = await getTasiDailySnapshotFromKv()
  if (cached && !isTasiDailySnapshotExpired(cached) && Array.isArray(cached.company) && cached.company.length > 0) {
    logger.info('company daily: cache hit KV', { snapshotDate: cached.date, count: cached.company.length })
    return cached.company
  }
  logger.info('company daily: cache miss, fetching from remote')
  const snapshot = await getTodaySnapshotFromRemoteAndPersist()
  return snapshot.company
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

/** Latest trading day: use KV snapshot if not expired (by TTL), else fetch from remote. No date match — data is previous trading day. */
async function getSummaryDailyToday(): Promise<TasiMarketSummary | null> {
  const cached = await getTasiDailySnapshotFromKv()
  if (cached && !isTasiDailySnapshotExpired(cached) && cached.summary != null) {
    logger.info('summary daily: cache hit KV', { snapshotDate: cached.date })
    return cached.summary
  }
  logger.info('summary daily: cache miss, fetching from remote')
  const snapshot = await getTodaySnapshotFromRemoteAndPersist()
  return snapshot.summary
}

/**
 * Fetch today from remote and apply write rules (same date → KV only; new date → DB then KV). Dedupes parallel calls.
 */
async function getTodaySnapshotFromRemoteAndPersist(): Promise<{ date: string; company: TasiCompanyDailyRecord[]; summary: TasiMarketSummary }> {
  if (todayRefreshPromise) return todayRefreshPromise
  const promise = (async () => {
    try {
      const [company, summary] = await Promise.all([fetchCompanyDailyFromBridge(), fetchSummaryFromBridge()])
      const date = summary.date ?? getTodayUtc()
      const snapshot = { date, company, summary }
      await applyFreshData(snapshot)
      return snapshot
    } finally {
      todayRefreshPromise = null
    }
  })()
  todayRefreshPromise = promise
  return promise
}

/**
 * Apply write rules: if prev KV has same date → update KV only; else write DB then KV (new day).
 */
async function applyFreshData(snapshot: { date: string; company: TasiCompanyDailyRecord[]; summary: TasiMarketSummary }): Promise<void> {
  const prev = await getTasiDailySnapshotFromKv()
  if (prev && prev.date === snapshot.date) {
    logger.info('applyFreshData: same date, KV only', { date: snapshot.date })
    await saveTasiDailySnapshotToKv(snapshot)
    return
  }
  logger.info('applyFreshData: new date, DB then KV', { date: snapshot.date, companyCount: snapshot.company.length })
  const dbWritePromise = (async () => {
    await writeCompanyDaily(snapshot.date, snapshot.company)
    await writeSummary(snapshot.date, snapshot.summary)
    await deleteOlderThanRetention()
  })()
  await Promise.all([dbWritePromise, saveTasiDailySnapshotToKv(snapshot)])
}

/**
 * Cron ingest: fetch from remote, then apply write rules (same date → KV only; new date → DB then KV). Fallback so no day is missed.
 *
 * @returns { written: boolean, date: string }
 */
export async function runIngest(): Promise<{ written: boolean; date: string }> {
  logger.info('ingest: fetch from bridge')
  const [company, summary] = await Promise.all([fetchCompanyDailyFromBridge(), fetchSummaryFromBridge()])
  const date = summary.date ?? getTodayUtc()
  const snapshot = { date, company, summary }

  const prev = await getTasiDailySnapshotFromKv()
  const sameDate = prev != null && prev.date === date
  if (sameDate) {
    logger.info('ingest: same date, KV only', { date })
    await saveTasiDailySnapshotToKv(snapshot)
    return { written: true, date }
  }
  logger.info('ingest: new date, DB then KV', { date, companyCount: company.length })
  const dbWritePromise = (async () => {
    await writeCompanyDaily(date, company)
    await writeSummary(date, summary)
    await deleteOlderThanRetention()
  })()
  await Promise.all([dbWritePromise, saveTasiDailySnapshotToKv(snapshot)])
  logger.info('ingest: done', { date })
  return { written: true, date }
}
