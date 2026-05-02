import { z } from 'zod'

import { tool } from '@/initializer/mcp'
import { parseStockMarket } from '@/services/finance/stock'
import { getCompanyDaily } from '@/services/finance/tasi'

/**
 * MCP tool: Saudi company daily rows (TASI feed / Turso). Other markets are not available on this tool.
 */
export const get_market_company_daily = tool(
  'get_market_company_daily',
  'Get company daily rows. Only market=TASI (default) is supported — full list or K-line from feed/Turso. No params = today all companies; date = that day; code + from + to = company K-line.',
  z.object({
    market: z.string().optional().describe('Must be TASI (default).'),
    date: z.string().optional().describe('Single date YYYY-MM-DD'),
    code: z.string().optional().describe('Company code for K-line (use with from and to)'),
    from: z.string().optional().describe('Start date YYYY-MM-DD for K-line'),
    to: z.string().optional().describe('End date YYYY-MM-DD for K-line'),
  }),
  async (params) => {
    const market = parseStockMarket(params.market?.trim() ?? 'TASI')
    if (!market || market !== 'TASI') {
      return {
        error: 'Only market=TASI is supported for company daily on this tool.',
        hint: 'Use get_stock_summary for other market index snapshots.',
      }
    }
    const list = await getCompanyDaily({
      date: params.date,
      code: params.code ?? undefined,
      from: params.from ?? undefined,
      to: params.to ?? undefined,
    })
    return list
  }
)
