import { z } from 'zod'

import { tool } from '@/initializer/mcp'
import { getMarketOhlcvLatestDaily, isMarketDailyOhlcvSymbolSetAllowedForSync, marketDailySymbolsRejectionMessage, parseSymbols } from '@/services/finance/market/daily'

/**
 * MCP tool: latest exchange daily OHLCV bar per symbol (six-digit or XAUUSD).
 */
export const get_market_daily_latest = tool(
  'get_market_daily_latest',
  'Latest one exchange OHLCV row per symbol (no start/end dates). Optional withIndicators; syncIfEmpty defaults true. Returns { asOf, items, synced } where asOf is ISO-8601 response time and items[].date is the bar trade calendar date.',
  z.object({
    symbols: z.string().describe('Comma-separated symbols: six-digit codes and/or XAUUSD'),
    withIndicators: z.boolean().optional().describe('Whether to include macdUp/macdDown on rows when enough history exists'),
    syncIfEmpty: z.boolean().optional().describe('When true (default), fetch latest from Eastmoney for symbols missing in Turso (allowlisted set only)'),
  }),
  async (params) => {
    const syncIfEmpty = params.syncIfEmpty !== false
    const symbols = parseSymbols(params.symbols)
    const reject = marketDailySymbolsRejectionMessage(symbols)
    if (reject) {
      throw new Error(reject)
    }
    if (symbols.length === 0) {
      throw new Error('symbols is required')
    }
    const allowOnDemandIngest = isMarketDailyOhlcvSymbolSetAllowedForSync(symbols)
    return getMarketOhlcvLatestDaily({
      symbolsRaw: params.symbols,
      withIndicators: params.withIndicators ?? false,
      syncIfEmpty,
      allowOnDemandIngest,
    })
  }
)
