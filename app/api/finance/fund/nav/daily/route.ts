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

const logger = createLogger('api-finance-fund-nav-daily')

/**
 * GET /api/finance/fund/nav/daily
 * Fund LSJZ historical NAV only (unit value + daily %). Rejects exchange-traded-only codes.
 * Query: symbols, startDate, endDate; optional syncIfEmpty (allowlisted NAV catalog only).
 */
export const GET = api(async (_req, ctx) => {
  const symbolsRaw = ctx.searchParams.get('symbols') ?? ''
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
  if (syncIfEmpty && items.length === 0) {
    logger.warn('syncIfEmpty produced no rows', { symbolsRaw, allowIngest, synced })
  }

  const publicItems = items.map(toPublicFundNavRecord).filter((row): row is NonNullable<typeof row> => row != null)
  if (publicItems.length !== items.length) {
    logger.warn('dropped non-NAV rows from fund/nav/daily response', { symbolsRaw, internal: items.length, public: publicItems.length })
  }

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
