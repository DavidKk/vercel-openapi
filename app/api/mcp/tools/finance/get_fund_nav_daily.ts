import { z } from 'zod'

import { tool } from '@/initializer/mcp'
import {
  fundNavDailySymbolsRejectionMessage,
  getMarketDailyWithOptionalSync,
  isFundNavSymbolSetAllowedForSync,
  parseSymbols,
  toPublicFundNavRecord,
} from '@/services/finance/market/daily'

/**
 * MCP tool: fund historical NAV (unit value + daily %) for configured NAV-only six-digit codes.
 */
export const get_fund_nav_daily = tool(
  'get_fund_nav_daily',
  'Get fund NAV daily rows (unitNav, dailyChangePercent) for LSJZ-backed codes only (e.g. 012922). Requires symbols,startDate,endDate; optional syncIfEmpty (default true) when Turso is empty for allowlisted NAV catalog symbols. For exchange OHLCV use get_market_daily.',
  z.object({
    symbols: z.string().describe('Comma-separated fund NAV six-digit codes, e.g. 012922,016665'),
    startDate: z.string().describe('Start date YYYY-MM-DD'),
    endDate: z.string().describe('End date YYYY-MM-DD'),
    syncIfEmpty: z.boolean().optional().describe('When true (default), attempt allowlisted on-demand ingest if first read is empty'),
  }),
  async (params) => {
    const syncIfEmpty = params.syncIfEmpty !== false
    const symbols = parseSymbols(params.symbols)
    const reject = fundNavDailySymbolsRejectionMessage(symbols)
    if (reject) {
      throw new Error(reject)
    }
    const allowOnDemandIngest = isFundNavSymbolSetAllowedForSync(symbols)
    const { items, synced } = await getMarketDailyWithOptionalSync({
      symbolsRaw: params.symbols,
      startDate: params.startDate,
      endDate: params.endDate,
      withIndicators: false,
      syncIfEmpty,
      allowOnDemandIngest,
    })
    const publicItems = items.map(toPublicFundNavRecord).filter((row): row is NonNullable<typeof row> => row != null)
    return { items: publicItems, synced }
  }
)
