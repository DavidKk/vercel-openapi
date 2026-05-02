import { singleFundPathSymbol } from '@/app/api/finance/fund/fundSymbolPath'
import { api } from '@/initializer/controller'
import { cacheControlNoStoreHeaders, jsonInvalidParameters, jsonSuccess } from '@/initializer/response'
import {
  getMarketDailyWithOptionalSync,
  isMarketDailyOhlcvSymbolSetAllowedForSync,
  marketDailySymbolsRejectionMessage,
  parseSymbols,
  toPublicOhlcvRecord,
} from '@/services/finance/market/daily'
import { createLogger } from '@/services/logger'

export const runtime = 'nodejs'

const logger = createLogger('api-finance-fund-symbol-ohlcv-daily')

/**
 * GET /api/finance/fund/:symbol/ohlcv/daily
 * Mirrors `/finance/fund/:symbol` — single-symbol exchange OHLCV range (same semantics as GET /api/finance/market/daily?symbols=:symbol).
 */
export const GET = api<{ symbol: string }>(async (_req, ctx) => {
  const params = await ctx.params
  const sym = singleFundPathSymbol(params.symbol)
  if (!sym) {
    return jsonInvalidParameters('Path must be a single six-digit code or XAUUSD.', { headers: cacheControlNoStoreHeaders() })
  }
  const symbolsRaw = sym
  const startDate = ctx.searchParams.get('startDate') ?? ''
  const endDate = ctx.searchParams.get('endDate') ?? ''
  const withIndicators = (ctx.searchParams.get('withIndicators') ?? '').toLowerCase() === 'true'
  const syncIfEmpty = (ctx.searchParams.get('syncIfEmpty') ?? '').toLowerCase() === 'true'
  logger.info('request', { symbolsRaw, startDate, endDate, withIndicators, syncIfEmpty })

  const symbols = parseSymbols(symbolsRaw)
  const navReject = marketDailySymbolsRejectionMessage(symbols)
  if (navReject) {
    return jsonInvalidParameters(navReject, { headers: cacheControlNoStoreHeaders() })
  }

  const allowIngest = isMarketDailyOhlcvSymbolSetAllowedForSync(symbols)
  const { items, synced } = await getMarketDailyWithOptionalSync({
    symbolsRaw,
    startDate,
    endDate,
    withIndicators,
    syncIfEmpty,
    allowOnDemandIngest: allowIngest,
  })

  const publicItems = items.map(toPublicOhlcvRecord).filter((row): row is NonNullable<typeof row> => row != null)
  return jsonSuccess(
    { items: publicItems, synced },
    {
      headers: new Headers({
        'Content-Type': 'application/json',
        'Cache-Control': 's-maxage=60, stale-while-revalidate=300',
      }),
    }
  )
})
