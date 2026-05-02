import { api } from '@/initializer/controller'
import { jsonInvalidParameters, jsonSuccess } from '@/initializer/response'
import { parseDate, parseSymbols } from '@/services/finance/market/daily'
import { getOverviewStockList } from '@/services/finance/overview/stockList'
import { createLogger } from '@/services/logger'

export const runtime = 'nodejs'

const logger = createLogger('api-finance-overview-stock-list')

/**
 * GET /api/finance/overview/stock-list
 * Returns `stockList` rows (stock.md shape): latest bar per symbol with self-computed MACD streaks.
 * Query: symbols (comma six-digit), startDate, endDate (YYYY-MM-DD); optional syncIfEmpty=true (allowlisted symbols only).
 */
export const GET = api(async (_req, ctx) => {
  const symbolsRaw = ctx.searchParams.get('symbols') ?? ''
  const startDate = ctx.searchParams.get('startDate') ?? ''
  const endDate = ctx.searchParams.get('endDate') ?? ''
  const syncIfEmpty = (ctx.searchParams.get('syncIfEmpty') ?? '').toLowerCase() === 'true'
  logger.info('request', { symbolsRaw, startDate, endDate, syncIfEmpty })

  if (!symbolsRaw.trim() || !startDate.trim() || !endDate.trim()) {
    return jsonInvalidParameters('symbols, startDate, and endDate are required.')
  }

  const symbols = parseSymbols(symbolsRaw)
  if (symbols.length === 0) {
    return jsonInvalidParameters('symbols must include at least one valid six-digit code.')
  }

  const sd = parseDate(startDate)
  const ed = parseDate(endDate)
  if (!sd || !ed || sd > ed) {
    return jsonInvalidParameters('startDate and endDate must be valid YYYY-MM-DD with startDate <= endDate.')
  }

  const { stockList, synced } = await getOverviewStockList({ symbolsRaw, startDate, endDate, syncIfEmpty })

  return jsonSuccess(
    { stockList, synced },
    {
      headers: new Headers({
        'Content-Type': 'application/json',
        'Cache-Control': 's-maxage=60, stale-while-revalidate=300',
      }),
    }
  )
})
