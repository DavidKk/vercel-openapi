import { z } from 'zod'

import { tool } from '@/initializer/mcp'
import { getStockSummary, getStockSummaryBatch, parseStockMarket } from '@/services/finance/stock'
import type { StockMarket } from '@/services/finance/stock/types'

/**
 * MCP tool: get stock market summary (single or batch).
 */
export const get_stock_summary = tool(
  'get_stock_summary',
  'Get stock market summary (same cold-start behavior as GET /api/finance/stock/summary). Use market for single query, or markets (comma-separated) for batch. REST wraps results in { code, message, data }; this tool returns the data object only: { market, summary } or { items }.',
  z.object({
    market: z.string().optional().describe('Single market name, e.g. TASI, S&P 500, Dow Jones'),
    markets: z.string().optional().describe('Comma-separated market names for batch query'),
  }),
  async (params) => {
    const marketsRaw = params.markets?.trim() ?? ''
    if (marketsRaw) {
      const markets = marketsRaw
        .split(',')
        .map((value) => value.trim())
        .map((value) => parseStockMarket(value))
        .filter((value): value is StockMarket => value != null)
      const items = await getStockSummaryBatch(markets)
      return { items }
    }

    const market = parseStockMarket(params.market?.trim() ?? 'TASI')
    if (!market) {
      return { error: 'Invalid market' }
    }
    const summary = await getStockSummary(market)
    return { market, summary }
  }
)
