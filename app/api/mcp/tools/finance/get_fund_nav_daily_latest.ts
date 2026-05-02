import { z } from 'zod'

import { tool } from '@/initializer/mcp'
import { fundNavDailySymbolsRejectionMessage, getFundNavLatestDaily, isFundNavSymbolSetAllowedForSync, parseSymbols } from '@/services/finance/market/daily'

/**
 * MCP tool: latest fund NAV row per configured LSJZ code.
 */
export const get_fund_nav_daily_latest = tool(
  'get_fund_nav_daily_latest',
  'Latest one fund NAV row per symbol (no date range). syncIfEmpty defaults true. Returns { asOf, items, synced } with unitNav and dailyChangePercent.',
  z.object({
    symbols: z.string().describe('Comma-separated configured NAV six-digit codes'),
    syncIfEmpty: z.boolean().optional().describe('When true (default), fetch latest LSJZ page when Turso has no row (allowlisted NAV catalog only)'),
  }),
  async (params) => {
    const syncIfEmpty = params.syncIfEmpty !== false
    const symbols = parseSymbols(params.symbols)
    const reject = fundNavDailySymbolsRejectionMessage(symbols)
    if (reject) {
      throw new Error(reject)
    }
    if (symbols.length === 0) {
      throw new Error('symbols is required')
    }
    const allowOnDemandIngest = isFundNavSymbolSetAllowedForSync(symbols)
    return getFundNavLatestDaily({
      symbolsRaw: params.symbols,
      syncIfEmpty,
      allowOnDemandIngest,
    })
  }
)
