import { singleFundPathSymbol } from '@/app/api/finance/fund/fundSymbolPath'
import { api } from '@/initializer/controller'
import { cacheControlNoStoreHeaders, jsonInvalidParameters, jsonSuccess } from '@/initializer/response'
import {
  fundNavDailySymbolsRejectionMessage,
  getMarketDailyWithOptionalSync,
  isFundNavSymbolSetAllowedForSync,
  parseSymbols,
  toPublicFundNavRecord,
} from '@/services/finance/market/daily'
import { createLogger } from '@/services/logger'

export const runtime = 'nodejs'

const logger = createLogger('api-finance-fund-symbol-nav-daily')

/**
 * GET /api/finance/fund/:symbol/nav/daily
 * Single-symbol fund NAV range (same semantics as GET /api/finance/fund/nav/daily?symbols=:symbol).
 */
export const GET = api<{ symbol: string }>(async (_req, ctx) => {
  const params = await ctx.params
  const sym = singleFundPathSymbol(params.symbol)
  if (!sym || sym === 'XAUUSD') {
    return jsonInvalidParameters('Path must be a single six-digit fund NAV code.', { headers: cacheControlNoStoreHeaders() })
  }
  const symbolsRaw = sym
  const startDate = ctx.searchParams.get('startDate') ?? ''
  const endDate = ctx.searchParams.get('endDate') ?? ''
  const syncIfEmpty = (ctx.searchParams.get('syncIfEmpty') ?? '').toLowerCase() === 'true'
  logger.info('request', { symbolsRaw, startDate, endDate, syncIfEmpty })

  const symbols = parseSymbols(symbolsRaw)
  const reject = fundNavDailySymbolsRejectionMessage(symbols)
  if (reject) {
    return jsonInvalidParameters(reject, { headers: cacheControlNoStoreHeaders() })
  }

  const allowIngest = isFundNavSymbolSetAllowedForSync(symbols)
  const { items, synced } = await getMarketDailyWithOptionalSync({
    symbolsRaw,
    startDate,
    endDate,
    withIndicators: false,
    syncIfEmpty,
    allowOnDemandIngest: allowIngest,
  })

  const publicItems = items.map(toPublicFundNavRecord).filter((row): row is NonNullable<typeof row> => row != null)
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
