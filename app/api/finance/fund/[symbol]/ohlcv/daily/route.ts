import { singleFundPathSymbol } from '@/app/api/finance/fund/fundSymbolPath'
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

const logger = createLogger('api-finance-fund-symbol-ohlcv-daily')

/**
 * GET /api/finance/fund/:symbol/ohlcv/daily
 * Mirrors `/finance/fund/:symbol` — single-symbol exchange OHLCV range (same semantics as GET /api/finance/market/daily?symbols=:symbol).
 * With `withIndicators=true`, each row adds `macdUp`/`macdDown` and `ema12`/`ema26`/`dif`/`dea`/`macd` (legacy cold-start MACD by default).
 * `indicatorWarmup=true` computes indicators with a 120-calendar-day lookback, then returns only the requested window.
 * `indicatorWarmupDays=35..250` computes indicators with an explicit calendar-day lookback and implies warmup.
 * `forceSync=true` refreshes the requested range for allowlisted symbols before reading cached rows.
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
