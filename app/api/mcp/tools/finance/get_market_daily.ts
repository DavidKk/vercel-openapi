import { z } from 'zod'

import { tool } from '@/initializer/mcp'
import {
  getMarketDailyWithOptionalSync,
  isMarketDailyOhlcvSymbolSetAllowedForSync,
  marketDailySymbolsRejectionMessage,
  parseSymbols,
  toPublicOhlcvRecord,
} from '@/services/finance/market/daily'

/**
 * MCP tool: query market daily OHLCV for six-digit symbols or **XAUUSD** (precious spot).
 */
export const get_market_daily = tool(
  'get_market_daily',
  'Get exchange daily OHLCV for six-digit symbols (e.g. 518880). Canonical REST per symbol: GET /api/finance/fund/{symbol}/ohlcv/daily. Fund NAV codes must use get_fund_nav_daily. Requires symbols,startDate,endDate; optional withIndicators; optional syncIfEmpty (default true) re-fetches from Eastmoney when Turso is empty for allowlisted fund/ETF symbols only. Returns items plus synced when a backfill ingest ran.',
  z.object({
    symbols: z.string().describe('Comma-separated symbols: six-digit codes and/or XAUUSD, e.g. 518880,510300 or XAUUSD'),
    startDate: z.string().describe('Start date YYYY-MM-DD'),
    endDate: z.string().describe('End date YYYY-MM-DD'),
    withIndicators: z.boolean().optional().describe('Whether to include macdUp/macdDown on latest row'),
    syncIfEmpty: z.boolean().optional().describe('When true (default), attempt allowlisted on-demand ingest if first read is empty'),
  }),
  async (params) => {
    const syncIfEmpty = params.syncIfEmpty !== false
    const symbols = parseSymbols(params.symbols)
    const reject = marketDailySymbolsRejectionMessage(symbols)
    if (reject) {
      throw new Error(reject)
    }
    const allowOnDemandIngest = isMarketDailyOhlcvSymbolSetAllowedForSync(symbols)
    const { items, synced } = await getMarketDailyWithOptionalSync({
      symbolsRaw: params.symbols,
      startDate: params.startDate,
      endDate: params.endDate,
      withIndicators: params.withIndicators ?? false,
      syncIfEmpty,
      allowOnDemandIngest,
    })
    const publicItems = items.map(toPublicOhlcvRecord).filter((row): row is NonNullable<typeof row> => row != null)
    return { items: publicItems, synced }
  }
)
