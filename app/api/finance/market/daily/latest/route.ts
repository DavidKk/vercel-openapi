import { api } from '@/initializer/controller'
import { cacheControlNoStoreHeaders, jsonInvalidParameters, jsonSuccess } from '@/initializer/response'
import { getMarketOhlcvLatestDaily, isMarketDailyOhlcvSymbolSetAllowedForSync, marketDailySymbolsRejectionMessage, parseSymbols } from '@/services/finance/market/daily'
import { createLogger } from '@/services/logger'

export const runtime = 'nodejs'

const logger = createLogger('api-finance-market-daily-latest')

/**
 * GET /api/finance/market/daily/latest
 * One latest exchange OHLCV bar per symbol (six-digit or XAUUSD). Rejects fund NAV codes.
 * Query: symbols (required). Optional withIndicators; syncIfEmpty defaults true when omitted.
 * Response data: { asOf, items, synced } — asOf is ISO-8601 response time; items[].date is the bar calendar date.
 */
export const GET = api(async (_req, ctx) => {
  const symbolsRaw = ctx.searchParams.get('symbols') ?? ''
  const withIndicators = (ctx.searchParams.get('withIndicators') ?? '').toLowerCase() === 'true'
  const syncRaw = ctx.searchParams.get('syncIfEmpty')
  const syncIfEmpty = syncRaw == null || syncRaw === '' ? true : syncRaw.toLowerCase() === 'true'
  logger.info('request', { symbolsRaw, withIndicators, syncIfEmpty })

  const symbols = parseSymbols(symbolsRaw)
  const navReject = marketDailySymbolsRejectionMessage(symbols)
  if (navReject) {
    return jsonInvalidParameters(navReject, { headers: cacheControlNoStoreHeaders() })
  }
  if (symbols.length === 0) {
    return jsonInvalidParameters('symbols is required (comma-separated six-digit codes and/or XAUUSD)', {
      headers: cacheControlNoStoreHeaders(),
    })
  }

  const allowOnDemandIngest = isMarketDailyOhlcvSymbolSetAllowedForSync(symbols)
  const { asOf, items, synced } = await getMarketOhlcvLatestDaily({
    symbolsRaw,
    withIndicators,
    syncIfEmpty,
    allowOnDemandIngest,
  })

  return jsonSuccess(
    { asOf, items, synced },
    {
      headers: new Headers({
        'Content-Type': 'application/json',
        'Cache-Control': 's-maxage=60, stale-while-revalidate=300',
      }),
    }
  )
})
