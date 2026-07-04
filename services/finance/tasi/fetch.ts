/**
 * Fetch today's TASI data from SAHMK Developer API. Used for read (today) and cron ingest.
 */

import { createLogger } from '@/services/logger'

import { mapSahmkQuoteToCompany, mapSahmkSummaryToTasiSummary } from './mapSahmk'
import { sahmkGetJson } from './sahmk-client'
import type { TasiCompanyDailyRecord, TasiMarketSummary } from './types'

const logger = createLogger('finance-tasi-fetch')

const SAHMK_CACHE_MS = 60 * 1000
const COMPANIES_PAGE_SIZE = 100
const QUOTES_BATCH_SIZE = 50
/** Pause between paginated / batched calls to stay under SAHMK burst limits. */
const SAHMK_REQUEST_GAP_MS = 1200

interface CacheEntry<T> {
  value: T
  expires: number
}

interface SahmkCompaniesPage {
  results?: Array<{ symbol?: string; status?: string }>
  total?: number
}

interface SahmkQuotesResponse {
  quotes?: Array<Record<string, unknown>>
}

let companyCache: CacheEntry<TasiCompanyDailyRecord[]> | null = null
let summaryCache: CacheEntry<TasiMarketSummary> | null = null

function isExpired<T>(entry: CacheEntry<T> | null): boolean {
  return entry == null || Date.now() >= entry.expires
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function isPlanRestrictedError(err: unknown): boolean {
  return err != null && typeof err === 'object' && 'planRestricted' in err && Boolean((err as { planRestricted?: boolean }).planRestricted)
}

/**
 * List active TASI symbols via SAHMK company directory (paginated).
 * @returns Symbol codes
 */
async function listTasiSymbols(): Promise<string[]> {
  const symbols: string[] = []
  let offset = 0
  let pageIndex = 0

  while (true) {
    if (pageIndex > 0) await sleep(SAHMK_REQUEST_GAP_MS)
    pageIndex += 1

    const page = await sahmkGetJson<SahmkCompaniesPage>('/companies/', `companies page ${pageIndex}`, {
      market: 'TASI',
      limit: String(COMPANIES_PAGE_SIZE),
      offset: String(offset),
    })
    const results = page.results ?? []

    for (const row of results) {
      const symbol = row.symbol?.trim()
      if (!symbol) continue
      if (row.status && row.status !== 'active') continue
      symbols.push(symbol)
    }

    const total = page.total ?? results.length
    offset += COMPANIES_PAGE_SIZE
    if (results.length === 0 || offset >= total) break
  }

  if (!symbols.length) {
    throw new Error('SAHMK companies directory returned no TASI symbols')
  }

  return symbols
}

/**
 * Fetch quotes for many symbols via SAHMK bulk `/quotes/` (Starter+).
 * Does not fall back to per-symbol `/quote/` to avoid burst throttling.
 * @param symbols Symbol list
 * @returns Quote payloads
 */
async function fetchQuotesForSymbols(symbols: string[]): Promise<Array<Record<string, unknown>>> {
  const quotes: Array<Record<string, unknown>> = []
  const batchCount = Math.ceil(symbols.length / QUOTES_BATCH_SIZE)

  for (let i = 0; i < symbols.length; i += QUOTES_BATCH_SIZE) {
    const batchIndex = Math.floor(i / QUOTES_BATCH_SIZE) + 1
    if (batchIndex > 1) await sleep(SAHMK_REQUEST_GAP_MS)

    const batch = symbols.slice(i, i + QUOTES_BATCH_SIZE)
    try {
      const body = await sahmkGetJson<SahmkQuotesResponse>('/quotes/', `quotes batch ${batchIndex}/${batchCount}`, {
        symbols: batch.join(','),
      })
      if (!Array.isArray(body.quotes) || !body.quotes.length) {
        throw new Error(`SAHMK quotes batch ${batchIndex} returned empty list`)
      }
      quotes.push(...body.quotes)
    } catch (err) {
      if (isPlanRestrictedError(err)) {
        throw new Error(
          'SAHMK bulk quotes (/quotes/) requires Starter plan or higher. Free tier cannot ingest full TASI daily list (use Starter+ or run ingest via cron with fewer symbols).'
        )
      }
      throw err
    }
  }

  return quotes
}

/**
 * Fetch company daily rows for the latest TASI session from SAHMK.
 * @param summaryDate Trading session date from market summary
 * @returns Company daily records
 */
export async function fetchCompanyDailyFromSahmk(summaryDate: string | null): Promise<TasiCompanyDailyRecord[]> {
  if (!isExpired(companyCache)) {
    logger.info('company daily: in-memory cache hit', { count: companyCache!.value.length })
    return companyCache!.value
  }

  logger.info('company daily: in-memory cache miss, fetching from SAHMK')
  const symbols = await listTasiSymbols()
  const quotes = await fetchQuotesForSymbols(symbols)
  const records = quotes.map((quote) => mapSahmkQuoteToCompany(quote, summaryDate))

  if (!records.length) {
    throw new Error('SAHMK quotes returned no company rows')
  }

  companyCache = { value: records, expires: Date.now() + SAHMK_CACHE_MS }
  logger.info('company daily: fetched from SAHMK', { count: records.length })
  return records
}

/**
 * Fetch TASI market summary for the latest session from SAHMK.
 * @returns Market summary
 */
export async function fetchSummaryFromSahmk(): Promise<TasiMarketSummary> {
  if (!isExpired(summaryCache)) {
    logger.info('summary daily: in-memory cache hit')
    return summaryCache!.value
  }

  logger.info('summary daily: in-memory cache miss, fetching from SAHMK')
  const raw = await sahmkGetJson<Record<string, unknown>>('/market/summary/', 'market summary', { index: 'TASI' })
  const summary = mapSahmkSummaryToTasiSummary(raw)

  summaryCache = { value: summary, expires: Date.now() + SAHMK_CACHE_MS }
  logger.info('summary daily: fetched from SAHMK', { date: summary.date })
  return summary
}

/**
 * Fetch today's company list and market summary together from SAHMK.
 * @returns Snapshot payload for KV/Turso ingest
 */
export async function fetchTodaySnapshotFromSahmk(): Promise<{
  date: string
  company: TasiCompanyDailyRecord[]
  summary: TasiMarketSummary
}> {
  const summary = await fetchSummaryFromSahmk()
  const company = await fetchCompanyDailyFromSahmk(summary.date)
  const date = summary.date ?? company[0]?.date
  if (!date) {
    throw new Error('SAHMK snapshot missing trading date')
  }
  return { date, company, summary: { ...summary, date } }
}
