import { singleFundPathSymbol } from '@/app/api/finance/fund/fundSymbolPath'
import { api } from '@/initializer/controller'
import { cacheControlNoStoreHeaders, jsonInvalidParameters, jsonSuccess } from '@/initializer/response'
import { fundNavDailySymbolsRejectionMessage, getFundNavLatestDaily, isFundNavSymbolSetAllowedForSync, parseSymbols } from '@/services/finance/market/daily'
import { createLogger } from '@/services/logger'

export const runtime = 'nodejs'

const logger = createLogger('api-finance-fund-symbol-nav-dailylatest')

/**
 * GET /api/finance/fund/:symbol/nav/dailylatest
 * Single-symbol latest NAV row (same semantics as GET /api/finance/fund/nav/daily/latest?symbols=:symbol).
 */
export const GET = api<{ symbol: string }>(async (_req, ctx) => {
  const params = await ctx.params
  const sym = singleFundPathSymbol(params.symbol)
  if (!sym || sym === 'XAUUSD') {
    return jsonInvalidParameters('Path must be a single six-digit fund NAV code.', { headers: cacheControlNoStoreHeaders() })
  }
  const symbolsRaw = sym
  const syncRaw = ctx.searchParams.get('syncIfEmpty')
  const syncIfEmpty = syncRaw == null || syncRaw === '' ? true : syncRaw.toLowerCase() === 'true'
  logger.info('request', { symbolsRaw, syncIfEmpty })

  const symbols = parseSymbols(symbolsRaw)
  const reject = fundNavDailySymbolsRejectionMessage(symbols)
  if (reject) {
    return jsonInvalidParameters(reject, { headers: cacheControlNoStoreHeaders() })
  }

  const allowOnDemandIngest = isFundNavSymbolSetAllowedForSync(symbols)
  const payload = await getFundNavLatestDaily({
    symbolsRaw,
    syncIfEmpty,
    allowOnDemandIngest,
  })

  return jsonSuccess(payload, {
    headers: new Headers({
      'Content-Type': 'application/json',
      'Cache-Control': 's-maxage=60, stale-while-revalidate=300',
    }),
  })
})
