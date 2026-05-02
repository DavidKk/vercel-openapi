import { api } from '@/initializer/controller'
import { jsonSuccess } from '@/initializer/response'
import { getMarketDailyWithOptionalSync, isFundEtfOhlcvSymbolSetAllowedForSync, parseSymbols } from '@/services/finance/market/daily'
import { createLogger } from '@/services/logger'

export const runtime = 'nodejs'

const logger = createLogger('api-finance-market-daily')

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

  const allowIngest = isFundEtfOhlcvSymbolSetAllowedForSync(parseSymbols(symbolsRaw))
  const { items, synced } = await getMarketDailyWithOptionalSync({
    symbolsRaw,
    startDate,
    endDate,
    withIndicators,
    syncIfEmpty,
    allowOnDemandIngest: allowIngest,
  })
  if (syncIfEmpty && items.length === 0) {
    logger.warn('syncIfEmpty produced no rows', { symbolsRaw, allowIngest, synced })
  }

  return jsonSuccess(
    {
      items,
      synced,
    },
    {
      headers: new Headers({
        'Content-Type': 'application/json',
        'Cache-Control': 's-maxage=60, stale-while-revalidate=300',
      }),
    }
  )
})
