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

const logger = createLogger('api-finance-market-daily')

/**
 * GET /api/finance/market/daily
 * Exchange-traded daily bars only (no fund NAV codes — use `GET /api/finance/fund/nav/daily` or per-symbol `GET /api/finance/fund/{symbol}/nav/daily`).
 * Query:
 * - symbols: comma-separated symbols (required): six-digit ETF/stock codes or **XAUUSD** (spot gold vs USD, Eastmoney `122.XAU`)
 * - startDate: YYYY-MM-DD (required)
 * - endDate: YYYY-MM-DD (required)
 * - withIndicators: true/false (optional, default false) — streak counts on the latest bar per symbol when true;
 *   every item always includes `macdUp` and `macdDown` (number or null)
 * - syncIfEmpty: when `true` and the first read returns no rows, runs Eastmoney range ingest then re-reads
 *   (only if every symbol is allowlisted: `FUND_ETF_OHLCV_SYMBOLS` and/or `XAUUSD`; Turso must be configured for writes)
 */
export const GET = api(async (_req, ctx) => {
  const symbolsRaw = ctx.searchParams.get('symbols') ?? ''
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
  if (syncIfEmpty && items.length === 0) {
    logger.warn('syncIfEmpty produced no rows', { symbolsRaw, allowIngest, synced })
  }

  const publicItems = items.map(toPublicOhlcvRecord).filter((row): row is NonNullable<typeof row> => row != null)
  if (publicItems.length !== items.length) {
    logger.warn('dropped non-OHLCV rows from market/daily response', { symbolsRaw, internal: items.length, public: publicItems.length })
  }

  return jsonSuccess(
    {
      items: publicItems,
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
