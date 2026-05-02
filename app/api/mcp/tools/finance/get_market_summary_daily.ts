import { z } from 'zod'

import { tool } from '@/initializer/mcp'
import { parseStockMarket } from '@/services/finance/stock'
import { getSummaryDaily } from '@/services/finance/tasi'

/**
 * MCP tool: TASI index summary daily (feed / Turso). Other markets: use get_stock_summary.
 */
export const get_market_summary_daily = tool(
  'get_market_summary_daily',
  'Get market summary daily. Only market=TASI (default) returns feed/Turso snapshot or K-line. For S&P 500, Dow Jones, etc., use get_stock_summary.',
  z.object({
    market: z.string().optional().describe('Must be TASI (default) for historical index summary here.'),
    date: z.string().optional().describe('Single date YYYY-MM-DD'),
    from: z.string().optional().describe('Start date YYYY-MM-DD for K-line'),
    to: z.string().optional().describe('End date YYYY-MM-DD for K-line'),
  }),
  async (params) => {
    const market = parseStockMarket(params.market?.trim() ?? 'TASI')
    if (!market || market !== 'TASI') {
      return {
        error: 'Only market=TASI is supported for summary daily on this tool (index K-line / Turso).',
        hint: 'Use get_stock_summary with market for other indices.',
      }
    }
    const data = await getSummaryDaily({
      date: params.date,
      from: params.from ?? undefined,
      to: params.to ?? undefined,
    })
    return data
  }
)
