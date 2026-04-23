import { getTasiDailySnapshotFromKv } from './snapshot'
import { deleteOlderThanRetention, writeSummaryHourly } from './turso'
import type { TasiMarketSummary } from './types'

const SAHMK_DEFAULT_BASE = 'https://app.sahmk.sa/api/v1'
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

function toNumberOrNull(input: unknown): number | null {
  if (typeof input === 'number' && Number.isFinite(input)) return input
  if (typeof input === 'string' && input.trim()) {
    const n = Number(input)
    if (Number.isFinite(n)) return n
  }
  return null
}

function toStringOrNull(input: unknown): string | null {
  if (typeof input !== 'string') return null
  const s = input.trim()
  return s || null
}

function mapSahmkSummaryToTasiSummary(raw: Record<string, unknown>): TasiMarketSummary {
  const changePercent = toNumberOrNull(raw.index_change_percent ?? raw.change_percent)
  return {
    date: toStringOrNull(raw.date ?? raw.trading_date ?? raw.updated_at),
    open: toNumberOrNull(raw.index_open ?? raw.open),
    high: toNumberOrNull(raw.index_high ?? raw.high),
    low: toNumberOrNull(raw.index_low ?? raw.low),
    close: toNumberOrNull(raw.index_value ?? raw.close),
    change: toNumberOrNull(raw.index_change ?? raw.change),
    changePercent,
    companiesTraded: toNumberOrNull(raw.companies_traded ?? raw.stocks_traded ?? raw.companies),
    volumeTraded: toNumberOrNull(raw.volume ?? raw.volume_traded),
    valueTraded: toNumberOrNull(raw.value ?? raw.value_traded),
    numberOfTrades: toNumberOrNull(raw.trades ?? raw.number_of_trades),
    marketCap: toNumberOrNull(raw.market_cap ?? raw.total_market_cap),
    notes: 'mapped-from-sahmk-hourly',
  }
}

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

export async function getTasiSummaryHourlyAlignment(): Promise<TasiSummaryHourlyAlignmentResult> {
  const sahmkApiKey = process.env.SAHMK_API_KEY?.trim()
  if (!sahmkApiKey) {
    throw new Error('SAHMK_API_KEY is not set')
  }
  const base = (process.env.SAHMK_API_BASE_URL?.trim() || SAHMK_DEFAULT_BASE).replace(/\/$/, '')
  const url = `${base}/market/summary/?index=TASI`
  const response = await fetch(url, {
    headers: new Headers({
      'X-API-Key': sahmkApiKey,
      Accept: 'application/json',
    }),
  })
  const rawText = await response.text()
  let rawData: unknown = rawText
  try {
    rawData = JSON.parse(rawText) as unknown
  } catch {
    // keep raw string
  }

  if (!response.ok) {
    return {
      ok: false,
      upstreamStatus: response.status,
      upstreamBody: rawData,
    }
  }

  const rawObject = rawData != null && typeof rawData === 'object' ? (rawData as Record<string, unknown>) : {}
  const mappedSummary = mapSahmkSummaryToTasiSummary(rawObject)
  // Compare with latest cached daily snapshot only to avoid triggering daily fetch/write side effects.
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
    upstreamStatus: response.status,
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
