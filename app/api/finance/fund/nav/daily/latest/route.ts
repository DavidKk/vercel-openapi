import { api } from '@/initializer/controller'
import { cacheControlNoStoreHeaders, jsonInvalidParameters, jsonSuccess } from '@/initializer/response'
import { fundNavDailySymbolsRejectionMessage, getFundNavLatestDaily, isFundNavSymbolSetAllowedForSync, parseSymbols } from '@/services/finance/market/daily'
import { createLogger } from '@/services/logger'

export const runtime = 'nodejs'

const logger = createLogger('api-finance-fund-nav-daily-latest')

/**
 * GET /api/finance/fund/nav/daily/latest
 * One latest LSJZ NAV row per configured fund code. Query: symbols (required); syncIfEmpty defaults true when omitted.
 * Response data: { asOf, items, synced } — asOf is ISO-8601 response time; items[].date is the NAV calendar date.
 */
export const GET = api(async (_req, ctx) => {
  const symbolsRaw = ctx.searchParams.get('symbols') ?? ''
  const syncRaw = ctx.searchParams.get('syncIfEmpty')
  const syncIfEmpty = syncRaw == null || syncRaw === '' ? true : syncRaw.toLowerCase() === 'true'
  logger.info('request', { symbolsRaw, syncIfEmpty })

  const symbols = parseSymbols(symbolsRaw)
  const reject = fundNavDailySymbolsRejectionMessage(symbols)
  if (reject) {
    return jsonInvalidParameters(reject, { headers: cacheControlNoStoreHeaders() })
  }
  if (symbols.length === 0) {
    return jsonInvalidParameters('symbols is required (comma-separated configured NAV six-digit codes)', {
      headers: cacheControlNoStoreHeaders(),
    })
  }

  const allowOnDemandIngest = isFundNavSymbolSetAllowedForSync(symbols)
  const { asOf, items, synced } = await getFundNavLatestDaily({
    symbolsRaw,
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
