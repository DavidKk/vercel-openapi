/**
 * Finance (TASI) daily snapshot cache for compare-before-write.
 *
 * We store the "today snapshot" in KV (and still write Turso only when data changed).
 */

import { getJsonKv, setJsonKv } from '@/services/kv/client'
import { createLogger } from '@/services/logger'

import { TASI_GIST_FILE_NAME, TASI_GIST_TTL_MS } from './constants'
import type { TasiCompanyDailyRecord, TasiMarketSummary } from './types'

const logger = createLogger('finance-tasi-gist')

/**
 * KV key for TASI daily snapshot.
 *
 * We keep the exported function names (getTasiSnapshotFromGist/saveTasiSnapshotToGist)
 * to avoid touching the rest of the codebase, but the storage backend is KV now.
 */
const TASI_SNAPSHOT_KV_KEY = `finance:tasi:${TASI_GIST_FILE_NAME}`

export interface TasiDailySnapshot {
  date: string
  company: TasiCompanyDailyRecord[]
  summary: TasiMarketSummary
  /** ISO timestamp when snapshot was saved. Used for cache expiry. */
  updatedAt?: string
}

/**
 * Whether the cached snapshot is expired (older than `TASI_GIST_TTL_MS`).
 * Missing `updatedAt` counts as expired.
 * @param snapshot Cached snapshot (or null)
 * @returns True when snapshot is missing or expired
 */
export function isGistSnapshotExpired(snapshot: TasiDailySnapshot | null): boolean {
  if (!snapshot?.updatedAt) return true
  const t = Date.parse(snapshot.updatedAt)
  if (Number.isNaN(t)) return true
  return Date.now() - t > TASI_GIST_TTL_MS
}

/**
 * Read last TASI daily snapshot from KV.
 * @returns Cached snapshot or null when missing/invalid
 */
export async function getTasiSnapshotFromGist(): Promise<TasiDailySnapshot | null> {
  try {
    const data = await getJsonKv<TasiDailySnapshot>(TASI_SNAPSHOT_KV_KEY)
    if (!data) return null
    if (!data?.date || !Array.isArray(data.company) || !data.summary) {
      logger.warn('TASI snapshot invalid structure')
      return null
    }
    logger.info('TASI snapshot read', { date: data.date, companyCount: data.company.length })
    return data
  } catch {
    return null
  }
}

/**
 * Save TASI daily snapshot to KV.
 * @param snapshot Snapshot to save
 * @returns Promise resolved when the write completes
 */
export async function saveTasiSnapshotToGist(snapshot: TasiDailySnapshot): Promise<void> {
  const toSave: TasiDailySnapshot = { ...snapshot, updatedAt: new Date().toISOString() }
  await setJsonKv(TASI_SNAPSHOT_KV_KEY, toSave)
  logger.info('TASI snapshot saved', { date: snapshot.date, companyCount: snapshot.company.length })
}

/**
 * Compare two snapshots by date and content (summary + company length and a simple hash of first/last).
 * Returns true if data is considered changed and should write to Turso.
 *
 * @param prev Previous snapshot or null
 * @param next New snapshot
 * @returns True when Turso write should happen
 */
export function tasiSnapshotChanged(prev: TasiDailySnapshot | null, next: TasiDailySnapshot): boolean {
  if (!prev) return true
  if (prev.date !== next.date) return true
  if (prev.company.length !== next.company.length) return true
  const prevSum = JSON.stringify(prev.summary)
  const nextSum = JSON.stringify(next.summary)
  if (prevSum !== nextSum) return true
  const prevFirst = prev.company[0]
  const nextFirst = next.company[0]
  const prevLast = prev.company[prev.company.length - 1]
  const nextLast = next.company[next.company.length - 1]
  if (JSON.stringify(prevFirst) !== JSON.stringify(nextFirst)) return true
  if (JSON.stringify(prevLast) !== JSON.stringify(nextLast)) return true
  return false
}
