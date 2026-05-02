import { FUND_ETF_OHLCV_SYMBOLS } from '@/app/finance/constants/fundEtfOhlcv'
import { api } from '@/initializer/controller'
import { jsonSuccess } from '@/initializer/response'
import { getMarketDaily, parseDate, parseSymbols, runMarketDailyIngestRange } from '@/services/finance/market/daily'
import { createLogger } from '@/services/logger'

export const runtime = 'nodejs'

const logger = createLogger('api-finance-market-daily')

const FUND_ETF_SYNC_ALLOW = new Set<string>(FUND_ETF_OHLCV_SYMBOLS)

/**
 * True when every parsed symbol is on the Finance fund/ETF allowlist (limits on-demand ingest abuse).
 *
 * @param symbols Parsed six-digit symbol list
 * @returns Whether sync-if-empty is allowed for this symbol set
 */
function allSymbolsInFundEtfAllowlist(symbols: string[]): boolean {
  return symbols.length > 0 && symbols.every((s) => FUND_ETF_SYNC_ALLOW.has(s))
}

/**
 * GET /api/finance/market/daily
 * Query:
 * - symbols: comma-separated six-digit symbols (required)
 * - startDate: YYYY-MM-DD (required)
 * - endDate: YYYY-MM-DD (required)
 * - withIndicators: true/false (optional, default false)
 * - syncIfEmpty: when `true` and the first read returns no rows, runs Eastmoney range ingest then re-reads
 *   (only if every symbol is in `FUND_ETF_OHLCV_SYMBOLS`; Turso must be configured for writes)
 */
export const GET = api(async (_req, ctx) => {
  const symbolsRaw = ctx.searchParams.get('symbols') ?? ''
  const startDate = ctx.searchParams.get('startDate') ?? ''
  const endDate = ctx.searchParams.get('endDate') ?? ''
  const withIndicators = (ctx.searchParams.get('withIndicators') ?? '').toLowerCase() === 'true'
  const syncIfEmpty = (ctx.searchParams.get('syncIfEmpty') ?? '').toLowerCase() === 'true'
  logger.info('request', { symbolsRaw, startDate, endDate, withIndicators, syncIfEmpty })

  let items = await getMarketDaily({ symbolsRaw, startDate, endDate, withIndicators })

  if (syncIfEmpty && items.length === 0) {
    const symbols = parseSymbols(symbolsRaw)
    const sd = parseDate(startDate)
    const ed = parseDate(endDate)
    if (allSymbolsInFundEtfAllowlist(symbols) && sd && ed && sd <= ed) {
      logger.info('syncIfEmpty: ingest then re-read', { symbols, startDate: sd, endDate: ed })
      await runMarketDailyIngestRange({ symbols, startDate: sd, endDate: ed })
      items = await getMarketDaily({ symbolsRaw, startDate, endDate, withIndicators })
    } else {
      logger.warn('syncIfEmpty skipped', { symbols, sd, ed, allow: allSymbolsInFundEtfAllowlist(symbols) })
    }
  }

  return jsonSuccess(
    {
      items,
    },
    {
      headers: new Headers({
        'Content-Type': 'application/json',
        'Cache-Control': 's-maxage=60, stale-while-revalidate=300',
      }),
    }
  )
})
