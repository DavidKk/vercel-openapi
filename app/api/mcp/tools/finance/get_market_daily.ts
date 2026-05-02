import { z } from 'zod'

import { tool } from '@/initializer/mcp'
import { getMarketDaily } from '@/services/finance/market/daily'

/**
 * MCP tool: query market daily OHLCV data for six-digit symbols.
 */
export const get_market_daily = tool(
  'get_market_daily',
  'Get market daily OHLCV data for six-digit symbols (e.g. 518880). Requires symbols,startDate,endDate; optional withIndicators to include macdUp/macdDown on latest row per symbol.',
  z.object({
    symbols: z.string().describe('Comma-separated six-digit symbols, e.g. 518880,510300'),
    startDate: z.string().describe('Start date YYYY-MM-DD'),
    endDate: z.string().describe('End date YYYY-MM-DD'),
    withIndicators: z.boolean().optional().describe('Whether to include macdUp/macdDown on latest row'),
  }),
  async (params) => {
    const items = await getMarketDaily({
      symbolsRaw: params.symbols,
      startDate: params.startDate,
      endDate: params.endDate,
      withIndicators: params.withIndicators ?? false,
    })
    return { items }
  }
)
