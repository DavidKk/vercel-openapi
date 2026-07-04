import type { TasiCompanyDailyRecord, TasiMarketSummary } from './types'

/**
 * Coerce unknown input to a finite number or null.
 * @param input Raw value from SAHMK payload
 * @returns Parsed number or null
 */
export function toNumberOrNull(input: unknown): number | null {
  if (typeof input === 'number' && Number.isFinite(input)) return input
  if (typeof input === 'string' && input.trim()) {
    const n = Number(input)
    if (Number.isFinite(n)) return n
  }
  return null
}

/**
 * Coerce unknown input to a trimmed string or null.
 * @param input Raw value from SAHMK payload
 * @returns Trimmed string or null
 */
export function toStringOrNull(input: unknown): string | null {
  if (typeof input !== 'string') return null
  const s = input.trim()
  return s || null
}

/**
 * Normalize SAHMK date / timestamp to YYYY-MM-DD.
 * @param value ISO timestamp or date string
 * @returns Normalized date or null
 */
export function parseSahmkDate(value: unknown): string | null {
  const direct = toStringOrNull(value)
  if (!direct) return null
  if (/^\d{4}-\d{2}-\d{2}$/.test(direct)) return direct
  const parsed = Date.parse(direct)
  if (Number.isNaN(parsed)) return null
  return new Date(parsed).toISOString().slice(0, 10)
}

function computeAmplitude(high: number | null, low: number | null, prevClose: number | null): number | null {
  if (high === null || low === null || prevClose === null || prevClose === 0) return null
  return Number((((high - low) / prevClose) * 100).toFixed(4))
}

function computeCompaniesTraded(raw: Record<string, unknown>): number | null {
  const direct = toNumberOrNull(raw.companies_traded ?? raw.stocks_traded ?? raw.companies)
  if (direct != null) return direct
  const advancing = toNumberOrNull(raw.advancing)
  const declining = toNumberOrNull(raw.declining)
  const unchanged = toNumberOrNull(raw.unchanged)
  if (advancing != null && declining != null && unchanged != null) {
    return advancing + declining + unchanged
  }
  return null
}

/**
 * Map SAHMK market summary payload to TasiMarketSummary.
 * @param raw SAHMK `/market/summary/` JSON object
 * @param notes Optional notes field for provenance
 * @returns Normalized market summary
 */
export function mapSahmkSummaryToTasiSummary(raw: Record<string, unknown>, notes = 'mapped-from-sahmk'): TasiMarketSummary {
  return {
    date: parseSahmkDate(raw.date ?? raw.trading_date ?? raw.timestamp ?? raw.updated_at),
    open: toNumberOrNull(raw.index_open ?? raw.open),
    high: toNumberOrNull(raw.index_high ?? raw.high),
    low: toNumberOrNull(raw.index_low ?? raw.low),
    close: toNumberOrNull(raw.index_value ?? raw.close),
    change: toNumberOrNull(raw.index_change ?? raw.change),
    changePercent: toNumberOrNull(raw.index_change_percent ?? raw.change_percent),
    companiesTraded: computeCompaniesTraded(raw),
    volumeTraded: toNumberOrNull(raw.total_volume ?? raw.volume ?? raw.volume_traded),
    valueTraded: toNumberOrNull(raw.total_value ?? raw.value ?? raw.value_traded),
    numberOfTrades: toNumberOrNull(raw.trades ?? raw.number_of_trades),
    marketCap: toNumberOrNull(raw.market_cap ?? raw.total_market_cap),
    notes,
  }
}

/**
 * Map SAHMK quote payload to TasiCompanyDailyRecord.
 * @param quote SAHMK quote object
 * @param fallbackDate Session date when quote has no updated_at
 * @returns Normalized company daily record
 */
export function mapSahmkQuoteToCompany(quote: Record<string, unknown>, fallbackDate: string | null): TasiCompanyDailyRecord {
  const prevClose = toNumberOrNull(quote.previous_close)
  const lastPrice = toNumberOrNull(quote.price)
  const high = toNumberOrNull(quote.high)
  const low = toNumberOrNull(quote.low)
  const open = toNumberOrNull(quote.open)
  const turnover = toNumberOrNull(quote.value ?? quote.net_liquidity)

  return {
    no: null,
    code: toStringOrNull(quote.symbol) ?? '',
    name: toStringOrNull(quote.name_en) ?? toStringOrNull(quote.name) ?? '',
    lastPrice,
    changePercent: toNumberOrNull(quote.change_percent),
    change: toNumberOrNull(quote.change),
    volume: toNumberOrNull(quote.volume),
    turnover,
    amplitude: computeAmplitude(high, low, prevClose),
    high,
    low,
    open,
    prevClose,
    volumeRatio: null,
    turnoverRate: null,
    peRatio: null,
    pbRatio: null,
    marketCap: null,
    circulatingMarketCap: null,
    numberOfTrades: null,
    speed: null,
    change_5m: null,
    change_60d: null,
    change_ytd: null,
    date: parseSahmkDate(quote.updated_at) ?? fallbackDate,
  }
}
