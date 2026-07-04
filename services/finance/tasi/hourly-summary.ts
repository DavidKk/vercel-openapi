import { mapSahmkSummaryToTasiSummary } from './mapSahmk'
import { sahmkGetJson } from './sahmk-client'
import { getTasiDailySnapshotFromKv } from './snapshot'
import { deleteOlderThanRetention, writeSummaryHourly } from './turso'
import type { TasiMarketSummary } from './types'

const FIELD_KEYS: Array<keyof TasiMarketSummary> = [
  'date',
  'open',
  'high',
  'low',
  'close',
  'change',
  'changePercent',
  'companiesTraded',
  'volumeTraded',
  'valueTraded',
  'numberOfTrades',
  'marketCap',
]

function isEqualValue(a: unknown, b: unknown): boolean {
  if (a == null && b == null) return true
  if (typeof a === 'number' && typeof b === 'number') return Math.abs(a - b) < 1e-6
  return a === b
}

export interface TasiSummaryHourlyAlignmentResult {
  ok: boolean
  interval?: 'hourly'
  upstreamStatus: number
  upstreamBody?: unknown
  aligned?: boolean
  alignmentRate?: string
  fieldCompare?: Array<{
    field: keyof TasiMarketSummary
    currentValue: unknown
    sahmkValue: unknown
    aligned: boolean
  }>
  summaryFromSahmk?: TasiMarketSummary
  summaryCurrent?: TasiMarketSummary | null
  raw?: unknown
  fetchedAt?: string
}

function getHourTsUtcIso(date = new Date()): string {
  const d = new Date(date)
  d.setUTCMinutes(0, 0, 0)
  return d.toISOString()
}

/**
 * Compare latest KV daily summary with a fresh SAHMK market summary payload.
 * @returns Alignment report
 */
export async function getTasiSummaryHourlyAlignment(): Promise<TasiSummaryHourlyAlignmentResult> {
  let rawData: unknown
  let upstreamStatus = 200

  try {
    rawData = await sahmkGetJson<Record<string, unknown>>('/market/summary/', 'market summary hourly', { index: 'TASI' })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    const statusMatch = message.match(/failed \((\d+)\):/)
    upstreamStatus = statusMatch ? Number(statusMatch[1]) : 500
    return {
      ok: false,
      upstreamStatus,
      upstreamBody: message,
    }
  }

  const rawObject = rawData != null && typeof rawData === 'object' ? (rawData as Record<string, unknown>) : {}
  const mappedSummary = mapSahmkSummaryToTasiSummary(rawObject, 'mapped-from-sahmk-hourly')
  const snapshot = await getTasiDailySnapshotFromKv()
  const currentSummary = snapshot?.summary ?? null

  const fieldCompare = FIELD_KEYS.map((field) => {
    const currentValue = currentSummary?.[field] ?? null
    const sahmkValue = mappedSummary[field] ?? null
    return {
      field,
      currentValue,
      sahmkValue,
      aligned: isEqualValue(currentValue, sahmkValue),
    }
  })
  const alignedFields = fieldCompare.filter((x) => x.aligned).length
  const totalFields = fieldCompare.length

  return {
    ok: true,
    interval: 'hourly',
    upstreamStatus,
    aligned: alignedFields === totalFields,
    alignmentRate: `${alignedFields}/${totalFields}`,
    fieldCompare,
    summaryFromSahmk: mappedSummary,
    summaryCurrent: currentSummary,
    raw: rawData,
    fetchedAt: new Date().toISOString(),
  }
}

export interface TasiSummaryHourlyIngestResult {
  mode: 'hourly'
  written: boolean
  hourTs: string
  date: string | null
  aligned: boolean | null
  upstreamStatus: number | null
  reason?: 'upstream_failed'
}

/**
 * Hourly ingest: fetch SAHMK summary, map/compare, then persist mapped summary to hourly table.
 * Retention cleanup uses shared 1-year policy.
 * @returns Ingest result
 */
export async function runIngestHourlySummary(): Promise<TasiSummaryHourlyIngestResult> {
  const alignment = await getTasiSummaryHourlyAlignment()
  const hourTs = getHourTsUtcIso()
  if (!alignment.ok || !alignment.summaryFromSahmk) {
    return {
      mode: 'hourly',
      written: false,
      hourTs,
      date: null,
      aligned: null,
      upstreamStatus: alignment.upstreamStatus ?? null,
      reason: 'upstream_failed',
    }
  }

  await writeSummaryHourly(hourTs, alignment.summaryFromSahmk)
  await deleteOlderThanRetention()
  return {
    mode: 'hourly',
    written: true,
    hourTs,
    date: alignment.summaryFromSahmk.date ?? null,
    aligned: alignment.aligned ?? null,
    upstreamStatus: alignment.upstreamStatus ?? null,
  }
}
