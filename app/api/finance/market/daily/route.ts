import { api } from '@/initializer/controller'
import { cacheControlNoStoreHeaders, jsonInvalidParameters, jsonSuccess } from '@/initializer/response'
import {
  getMarketDailyWithOptionalSync,
  INDICATOR_WARMUP_DAYS_MAX,
  INDICATOR_WARMUP_DAYS_MIN,
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
 * - indicatorWarmup: true/false (optional, default false) — when true, computes indicators with a 120-calendar-day lookback before returning the requested window
 * - indicatorWarmupDays: integer 35..250 (optional) — explicit calendar-day lookback; implies indicator warmup
 * - syncIfEmpty: when `true`, re-fetches allowlisted symbols if the cached range is empty or has a large internal gap
 * - forceSync: when `true`, refreshes the requested range for allowlisted symbols before reading cached rows
 *   (only if every symbol is allowlisted: `FUND_ETF_OHLCV_SYMBOLS` and/or `XAUUSD`; Turso must be configured for writes)
 */
export const GET = api(async (_req, ctx) => {
  const symbolsRaw = ctx.searchParams.get('symbols') ?? ''
  const startDate = ctx.searchParams.get('startDate') ?? ''
  const endDate = ctx.searchParams.get('endDate') ?? ''
  const withIndicators = (ctx.searchParams.get('withIndicators') ?? '').toLowerCase() === 'true'
  const indicatorWarmup = (ctx.searchParams.get('indicatorWarmup') ?? '').toLowerCase() === 'true'
  const indicatorWarmupDaysRaw = ctx.searchParams.get('indicatorWarmupDays')
  const indicatorWarmupDays = indicatorWarmupDaysRaw == null || indicatorWarmupDaysRaw === '' ? undefined : Number(indicatorWarmupDaysRaw)
  if (
    indicatorWarmupDays !== undefined &&
    (!Number.isInteger(indicatorWarmupDays) || indicatorWarmupDays < INDICATOR_WARMUP_DAYS_MIN || indicatorWarmupDays > INDICATOR_WARMUP_DAYS_MAX)
  ) {
    return jsonInvalidParameters(`indicatorWarmupDays must be an integer between ${INDICATOR_WARMUP_DAYS_MIN} and ${INDICATOR_WARMUP_DAYS_MAX}.`, {
      headers: cacheControlNoStoreHeaders(),
    })
  }
  const syncIfEmpty = (ctx.searchParams.get('syncIfEmpty') ?? '').toLowerCase() === 'true'
  const forceSync = (ctx.searchParams.get('forceSync') ?? '').toLowerCase() === 'true'
  logger.info('request', { symbolsRaw, startDate, endDate, withIndicators, indicatorWarmup, indicatorWarmupDays, syncIfEmpty, forceSync })

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
    indicatorWarmup,
    indicatorWarmupDays,
    syncIfEmpty,
    forceSync,
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
