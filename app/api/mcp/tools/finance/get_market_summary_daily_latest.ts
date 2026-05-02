import { z } from 'zod'

import { tool } from '@/initializer/mcp'
import { parseStockMarket } from '@/services/finance/stock'
import { getSummaryDaily } from '@/services/finance/tasi'

/**
 * MCP tool: TASI index summary for the latest session plus response timestamp.
 */
export const get_market_summary_daily_latest = tool(
  'get_market_summary_daily_latest',
  'TASI market index summary for the latest available trading session. Optional market (default TASI). Returns { asOf, dataDate, summary }.',
  z.object({
    market: z.string().optional().describe('Exchange feed market; only TASI is supported (default TASI)'),
  }),
  async (params) => {
    const marketRaw = (params.market ?? 'TASI').trim()
    const market = parseStockMarket(marketRaw)
    if (!market || market !== 'TASI') {
      throw new Error('Only market=TASI is supported; use get_stock_summary for other indices.')
    }
    const asOf = new Date().toISOString()
    const summary = await getSummaryDaily({})
    const dataDate = summary != null && !Array.isArray(summary) ? summary.date : null
    return { asOf, dataDate, summary }
  }
)
