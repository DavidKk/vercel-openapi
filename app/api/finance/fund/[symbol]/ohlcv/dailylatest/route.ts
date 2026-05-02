import { singleFundPathSymbol } from '@/app/api/finance/fund/fundSymbolPath'
import { api } from '@/initializer/controller'
import { cacheControlNoStoreHeaders, jsonInvalidParameters, jsonSuccess } from '@/initializer/response'
import {
  getMarketOhlcvLatestDaily,
  isMarketDailyOhlcvSymbolSetAllowedForSync,
  marketDailySymbolsRejectionMessage,
  parseSymbols,
  parseWithIndicatorsLatestDefaultTrue,
} from '@/services/finance/market/daily'
import { createLogger } from '@/services/logger'

export const runtime = 'nodejs'

const logger = createLogger('api-finance-fund-symbol-ohlcv-dailylatest')

/**
 * GET /api/finance/fund/:symbol/ohlcv/dailylatest
 * Single-symbol latest OHLCV bar (same semantics as GET /api/finance/market/daily/latest?symbols=:symbol).
 * Query: optional withIndicators (defaults **true**; `false`, `0`, `no`, or `off` to skip MACD streak); syncIfEmpty defaults true when omitted.
 */
export const GET = api<{ symbol: string }>(async (_req, ctx) => {
  const params = await ctx.params
  const sym = singleFundPathSymbol(params.symbol)
  if (!sym) {
    return jsonInvalidParameters('Path must be a single six-digit code or XAUUSD.', { headers: cacheControlNoStoreHeaders() })
  }
  const symbolsRaw = sym
  const withIndicators = parseWithIndicatorsLatestDefaultTrue(ctx.searchParams.get('withIndicators'))
  const syncRaw = ctx.searchParams.get('syncIfEmpty')
  const syncIfEmpty = syncRaw == null || syncRaw === '' ? true : syncRaw.toLowerCase() === 'true'
  logger.info('request', { symbolsRaw, withIndicators, syncIfEmpty })

  const symbols = parseSymbols(symbolsRaw)
  const navReject = marketDailySymbolsRejectionMessage(symbols)
  if (navReject) {
    return jsonInvalidParameters(navReject, { headers: cacheControlNoStoreHeaders() })
  }

  const allowOnDemandIngest = isMarketDailyOhlcvSymbolSetAllowedForSync(symbols)
  const payload = await getMarketOhlcvLatestDaily({
    symbolsRaw,
    withIndicators,
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
