/**
 * Browser-only IndexedDB cache for TASI (company daily + market summary).
 * Expiry follows GIST: use updatedAt + TTL; if expired, treat as cache miss and fetch from API.
 * Do not import from API routes or server code (no window).
 */

import { IDB_STORES, openSharedDb } from '@/services/idb-cache'

import { TASI_GIST_TTL_MS } from '../constants'
import type { TasiCompanyDailyRecord, TasiMarketSummary } from '../types'

const COMPANY_STORE = IDB_STORES.TASI_COMPANY_DAILY
const SUMMARY_STORE = IDB_STORES.TASI_MARKET_SUMMARY

/** Summary store row: date, payload (JSON string), and updatedAt (ISO) for TTL. */
interface SummaryRow {
  date: string
  payload: string
  updatedAt?: string
}

/**
 * Whether the IDB snapshot is expired (same rule as GIST: older than TASI_GIST_TTL_MS).
 * Missing or invalid updatedAt counts as expired.
 */
export function isIdbSnapshotExpired(updatedAt: string | undefined): boolean {
  if (!updatedAt) return true
  const t = Date.parse(updatedAt)
  if (Number.isNaN(t)) return true
  return Date.now() - t > TASI_GIST_TTL_MS
}

function openCompanyStore(): Promise<IDBDatabase> {
  return openSharedDb(COMPANY_STORE)
}

function openSummaryStore(): Promise<IDBDatabase> {
  return openSharedDb(SUMMARY_STORE)
}

/**
 * Read company daily records for one date from IndexedDB.
 *
 * @param date YYYY-MM-DD
 * @returns Array of records or []
 */
export async function readCompanyDailyByDateFromIdb(date: string): Promise<TasiCompanyDailyRecord[]> {
  if (typeof window === 'undefined' || !window.indexedDB) return []
  const db = await openCompanyStore()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(COMPANY_STORE, 'readonly')
    const store = tx.objectStore(COMPANY_STORE)
    const index = store.index('by_date')
    const req = index.getAll(IDBKeyRange.only(date))
    req.onsuccess = () => {
      db.close()
      const rows = (req.result ?? []) as Array<{ date_code: string; date: string; payload: string }>
      const out = rows.map((r) => JSON.parse(r.payload) as TasiCompanyDailyRecord)
      resolve(out)
    }
    req.onerror = () => {
      db.close()
      reject(req.error)
    }
  })
}

/**
 * Read market summary for one date from IndexedDB (no expiry check; use getLatestValidSnapshotFromIdb for cache-first).
 *
 * @param date YYYY-MM-DD
 * @returns Summary or null
 */
export async function readSummaryByDateFromIdb(date: string): Promise<TasiMarketSummary | null> {
  if (typeof window === 'undefined' || !window.indexedDB) return null
  const db = await openSummaryStore()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(SUMMARY_STORE, 'readonly')
    const store = tx.objectStore(SUMMARY_STORE)
    const req = store.get(date)
    req.onsuccess = () => {
      db.close()
      const row = req.result as SummaryRow | undefined
      if (!row?.payload) {
        resolve(null)
        return
      }
      resolve(JSON.parse(row.payload) as TasiMarketSummary)
    }
    req.onerror = () => {
      db.close()
      reject(req.error)
    }
  })
}

/**
 * Write company daily records for one date. Replaces any existing rows for that date.
 *
 * @param date YYYY-MM-DD
 * @param records Company daily records
 */
export async function writeCompanyDailyToIdb(date: string, records: TasiCompanyDailyRecord[]): Promise<void> {
  if (typeof window === 'undefined' || !window.indexedDB) return
  const db = await openCompanyStore()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(COMPANY_STORE, 'readwrite')
    const store = tx.objectStore(COMPANY_STORE)
    const index = store.index('by_date')
    const range = IDBKeyRange.only(date)
    const cursorReq = index.openCursor(range)
    cursorReq.onsuccess = () => {
      const cursor = cursorReq.result
      if (cursor) {
        cursor.delete()
        cursor.continue()
        return
      }
      for (const rec of records) {
        const code = rec.code ?? ''
        const date_code = `${date}:${code}`
        store.put({ date_code, date, payload: JSON.stringify(rec) })
      }
    }
    tx.oncomplete = () => {
      db.close()
      resolve()
    }
    tx.onerror = () => {
      db.close()
      reject(tx.error)
    }
  })
}

/**
 * Write market summary for one date. Sets updatedAt (ISO) so expiry follows GIST TTL.
 *
 * @param date YYYY-MM-DD
 * @param summary Market summary
 */
export async function writeSummaryToIdb(date: string, summary: TasiMarketSummary): Promise<void> {
  if (typeof window === 'undefined' || !window.indexedDB) return
  const db = await openSummaryStore()
  const updatedAt = new Date().toISOString()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(SUMMARY_STORE, 'readwrite')
    const store = tx.objectStore(SUMMARY_STORE)
    store.put({ date, payload: JSON.stringify(summary), updatedAt })
    tx.oncomplete = () => {
      db.close()
      resolve()
    }
    tx.onerror = () => {
      db.close()
      reject(tx.error)
    }
  })
}

/**
 * Return the latest snapshot date we have in IndexedDB (from summary store), or null.
 */
export async function getLatestSnapshotDateFromIdb(): Promise<string | null> {
  if (typeof window === 'undefined' || !window.indexedDB) return null
  const db = await openSummaryStore()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(SUMMARY_STORE, 'readonly')
    const store = tx.objectStore(SUMMARY_STORE)
    const req = store.getAllKeys()
    req.onsuccess = () => {
      db.close()
      const keys = (req.result ?? []) as string[]
      if (keys.length === 0) {
        resolve(null)
        return
      }
      const sorted = keys.filter((k) => /^\d{4}-\d{2}-\d{2}$/.test(k)).sort()
      resolve(sorted[sorted.length - 1] ?? null)
    }
    req.onerror = () => {
      db.close()
      reject(req.error)
    }
  })
}

/**
 * Get latest snapshot from IDB only if not expired (same TTL as GIST).
 * Use this for cache-first read: if expired or missing, return null and caller should fetch from API.
 *
 * @returns { company, summary } or null when no data or cache expired
 */
export async function getLatestValidSnapshotFromIdb(): Promise<{
  company: TasiCompanyDailyRecord[]
  summary: TasiMarketSummary
} | null> {
  if (typeof window === 'undefined' || !window.indexedDB) return null
  const date = await getLatestSnapshotDateFromIdb()
  if (!date) return null
  const db = await openSummaryStore()
  const summaryRow = await new Promise<SummaryRow | null>((resolve, reject) => {
    const tx = db.transaction(SUMMARY_STORE, 'readonly')
    const store = tx.objectStore(SUMMARY_STORE)
    const req = store.get(date)
    req.onsuccess = () => {
      db.close()
      resolve((req.result as SummaryRow) ?? null)
    }
    req.onerror = () => {
      db.close()
      reject(req.error)
    }
  })
  if (!summaryRow?.payload || isIdbSnapshotExpired(summaryRow.updatedAt)) {
    return null
  }
  const summary = JSON.parse(summaryRow.payload) as TasiMarketSummary
  const company = await readCompanyDailyByDateFromIdb(date)
  if (company.length === 0) return null
  return { company, summary }
}
