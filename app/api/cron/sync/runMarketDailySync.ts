import { FUND_ETF_OHLCV_SYMBOLS } from '@/app/finance/constants/fundEtfOhlcv'
import { runMarketDailyIngest, runMarketDailyIngestRange } from '@/services/finance/market/daily'
import { createLogger } from '@/services/logger'

const logger = createLogger('cron-finance-eastmoney-daily-shared')

/**
 * Built-in symbol preset for Eastmoney-backed market daily OHLCV cron routes.
 * - `fund`: configured Fund/ETF six-digit OHLCV list only
 * - `precious`: spot gold vs USD (XAUUSD) only
 * - `fund_and_precious`: union used by the legacy combined cron path
 */
export type FinanceMarketDailySyncPreset = 'fund' | 'precious' | 'fund_and_precious'

/**
 * Map `category` query for the internal `finance-eastmoney-sync` cron handler to an ingest preset.
 * Omitted or `all` keeps backward-compatible fund + XAUUSD defaults.
 *
 * @param raw Raw `category` query value
 * @returns Preset, or null when the value is not recognized
 */
export function parseEastmoneyDailySyncCategory(raw: string | null): FinanceMarketDailySyncPreset | null {
  if (raw == null || raw.trim() === '') return 'fund_and_precious'
  const v = raw.trim().toLowerCase()
  if (v === 'all') return 'fund_and_precious'
  if (v === 'fund') return 'fund'
  if (v === 'precious') return 'precious'
  return null
}

/**
 * Resolve the symbol list for a market-daily cron run.
 * Precedence: non-empty `symbolsRaw` → optional env override → preset defaults.
 *
 * @param symbolsRaw Raw `symbols` query string (comma-separated)
 * @param envSymbolsRaw Optional `FINANCE_MARKET_SYMBOLS` env value (shared across fund/precious/legacy routes; when set, applies to all unless `symbols` query is non-empty)
 * @param preset Which default list to apply when both query and env are empty
 * @returns Non-empty trimmed symbol codes
 */
export function resolveMarketDailyCronSymbols(symbolsRaw: string, envSymbolsRaw: string | undefined, preset: FinanceMarketDailySyncPreset): string[] {
  const fromQuery = symbolsRaw.trim()
  if (fromQuery) {
    return fromQuery
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
  }
  const fromEnv = envSymbolsRaw?.trim()
  if (fromEnv) {
    return fromEnv
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
  }
  if (preset === 'fund') return [...FUND_ETF_OHLCV_SYMBOLS]
  if (preset === 'precious') return ['XAUUSD']
  return [...FUND_ETF_OHLCV_SYMBOLS, 'XAUUSD']
}

/**
 * Run Eastmoney fetch + Turso upsert for market daily OHLCV (latest per symbol, or optional date range).
 *
 * @param options Query/env resolution plus optional `startDate` and `endDate` for range mode
 * @returns Summary from `runMarketDailyIngest` or `runMarketDailyIngestRange`
 */
export async function runMarketDailySyncCron(options: {
  symbolsRaw: string
  envSymbolsRaw: string | undefined
  preset: FinanceMarketDailySyncPreset
  startDate: string
  endDate: string
}): Promise<{ total: number; written: number }> {
  const symbols = resolveMarketDailyCronSymbols(options.symbolsRaw, options.envSymbolsRaw, options.preset)
  const isRangeMode = options.startDate !== '' && options.endDate !== ''
  logger.info('finance market daily cron start', { symbols, preset: options.preset, isRangeMode })
  const result = isRangeMode ? await runMarketDailyIngestRange({ symbols, startDate: options.startDate, endDate: options.endDate }) : await runMarketDailyIngest(symbols)
  logger.info('finance market daily cron done', { preset: options.preset, result })
  return result
}
