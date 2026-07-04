import { z } from 'zod'

import { tool } from '@/initializer/mcp'
import { getStockSummaryDaily, parseStockMarket } from '@/services/finance/stock'

/**
 * MCP tool: daily stock index summary for one market (latest, single date, or range).
 */
export const get_stock_summary_daily = tool(
  'get_stock_summary_daily',
  'Get daily stock index summary for one market (same as GET /api/finance/stock/summary/daily). Omit date/from/to for latest (same as get_stock_summary). Optional date (single day) or from+to (range, max 365 days). Returns { market, summary } or { market, items }.',
  z.object({
    market: z.string().optional().describe('Market name, default TASI'),
    date: z.string().optional().describe('Single day YYYY-MM-DD'),
    from: z.string().optional().describe('Range start YYYY-MM-DD (requires to)'),
    to: z.string().optional().describe('Range end YYYY-MM-DD (requires from)'),
  }),
  async (params) => {
    const market = parseStockMarket(params.market?.trim() ?? 'TASI')
    if (!market) {
      return { error: 'Invalid market' }
    }

    if (params.date && (params.from || params.to)) {
      return { error: 'Use date OR from+to, not both.' }
    }
    if ((params.from && !params.to) || (!params.from && params.to)) {
      return { error: 'from and to must be provided together.' }
    }

    if (params.from && params.to) {
      const items = await getStockSummaryDaily(market, { from: params.from, to: params.to })
      const list = Array.isArray(items) ? items : []
      return { market, items: list }
    }

    const summary = await getStockSummaryDaily(market, params.date ? { date: params.date } : {})
    if (Array.isArray(summary)) {
      return { market, items: summary }
    }
    return { market, summary }
  }
)
