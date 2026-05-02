import { z } from 'zod'

import { tool } from '@/initializer/mcp'
import { parseStockMarket } from '@/services/finance/stock'
import { getTasiSummaryHourlyAlignment } from '@/services/finance/tasi/hourly-summary'

/**
 * MCP tool: TASI hourly summary alignment (SAHMK vs daily mapping). Only TASI is implemented.
 */
export const get_market_summary_hourly = tool(
  'get_market_summary_hourly',
  'Get hourly alignment check for TASI (SAHMK vs current summary/daily mapping). market must be TASI (default).',
  z.object({
    market: z.string().optional().describe('Must be TASI (default).'),
  }),
  async (params) => {
    const market = parseStockMarket(params.market?.trim() ?? 'TASI')
    if (!market || market !== 'TASI') {
      return { error: 'Only market=TASI is supported for hourly alignment.' }
    }
    const data = await getTasiSummaryHourlyAlignment()
    return data
  }
)
