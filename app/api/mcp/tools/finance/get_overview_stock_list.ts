import { z } from 'zod'

import { tool } from '@/initializer/mcp'
import { getOverviewStockList } from '@/services/finance/overview/stockList'

/**
 * MCP tool: latest per-symbol snapshot with MACD streak (same as GET /api/finance/overview/stock-list).
 */
export const get_overview_stock_list = tool(
  'get_overview_stock_list',
  'Overview stockList (not full OHLCV): one row per symbol for the range end with price and MACD streak counts. Params: symbols, startDate, endDate; optional syncIfEmpty (default true for allowlisted fund/ETF). For full exchange rows use get_market_daily; for fund NAV LSJZ rows use get_fund_nav_daily.',
  z.object({
    symbols: z.string().describe('Comma-separated six-digit symbols'),
    startDate: z.string().describe('Range start YYYY-MM-DD'),
    endDate: z.string().describe('Range end YYYY-MM-DD'),
    syncIfEmpty: z.boolean().optional().describe('When true (default), backfill Turso once if empty for allowlisted symbols'),
  }),
  async (params) => {
    const syncIfEmpty = params.syncIfEmpty !== false
    return getOverviewStockList({
      symbolsRaw: params.symbols,
      startDate: params.startDate,
      endDate: params.endDate,
      syncIfEmpty,
    })
  }
)
