/**
 * Finance (TASI) daily snapshot in GIST for compare-before-write. Only write Turso when data changed.
 */

import { getGistInfo, readGistFile, writeGistFile } from '@/services/gist'
import { createLogger } from '@/services/logger'

import { TASI_GIST_FILE_NAME, TASI_GIST_TTL_MS } from './constants'
import type { TasiCompanyDailyRecord, TasiMarketSummary } from './types'

const logger = createLogger('finance-tasi-gist')

export interface TasiDailySnapshot {
  date: string
  company: TasiCompanyDailyRecord[]
  summary: TasiMarketSummary
  /** ISO timestamp when snapshot was saved. Used for GIST expiry. */
  updatedAt?: string
}

/**
 * Whether the GIST snapshot is expired (older than TASI_GIST_TTL_MS). Missing updatedAt counts as expired.
 */
export function isGistSnapshotExpired(snapshot: TasiDailySnapshot | null): boolean {
  if (!snapshot?.updatedAt) return true
  const t = Date.parse(snapshot.updatedAt)
  if (Number.isNaN(t)) return true
  return Date.now() - t > TASI_GIST_TTL_MS
}

/**
 * Read last TASI daily snapshot from GIST. Returns null if file missing or invalid.
 *
 * @returns Snapshot or null
 */
export async function getTasiSnapshotFromGist(): Promise<TasiDailySnapshot | null> {
  const { gistId, gistToken } = getGistInfo()
  try {
    const content = await readGistFile({ gistId, gistToken, fileName: TASI_GIST_FILE_NAME })
    const data = JSON.parse(content) as TasiDailySnapshot
    if (!data?.date || !Array.isArray(data.company) || !data.summary) {
      logger.warn('GIST snapshot invalid structure')
      return null
    }
    logger.info('GIST snapshot read', { date: data.date, companyCount: data.company.length })
    return data
  } catch (err) {
    if (err instanceof Error && err.message.includes('not found')) {
      logger.info('GIST snapshot not found')
      return null
    }
    throw err
  }
}

/**
 * Save TASI daily snapshot to GIST.
 *
 * @param snapshot Snapshot to save
 */
export async function saveTasiSnapshotToGist(snapshot: TasiDailySnapshot): Promise<void> {
  const { gistId, gistToken } = getGistInfo()
  const toSave: TasiDailySnapshot = { ...snapshot, updatedAt: new Date().toISOString() }
  const content = JSON.stringify(toSave, null, 2)
  await writeGistFile({ gistId, gistToken, fileName: TASI_GIST_FILE_NAME, content })
  logger.info('GIST snapshot saved', { date: snapshot.date, companyCount: snapshot.company.length })
}

/**
 * Compare two snapshots by date and content (summary + company length and a simple hash of first/last).
 * Returns true if data is considered changed and should write to Turso.
 *
 * @param prev Previous snapshot or null
 * @param next New snapshot
 * @returns true when should write
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
