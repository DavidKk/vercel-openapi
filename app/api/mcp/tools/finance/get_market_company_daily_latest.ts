import { z } from 'zod'

import { tool } from '@/initializer/mcp'
import { parseStockMarket } from '@/services/finance/stock'
import { getCompanyDaily } from '@/services/finance/tasi'

/**
 * MCP tool: TASI all-company snapshot for the latest session plus response timestamp.
 */
export const get_market_company_daily_latest = tool(
  'get_market_company_daily_latest',
  'TASI constituent company rows for the latest available session (full list). Optional market (default TASI). Returns { asOf, dataDate, items }.',
  z.object({
    market: z.string().optional().describe('Exchange feed market; only TASI is supported (default TASI)'),
  }),
  async (params) => {
    const marketRaw = (params.market ?? 'TASI').trim()
    const market = parseStockMarket(marketRaw)
    if (!market || market !== 'TASI') {
      throw new Error('Only market=TASI is supported.')
    }
    const asOf = new Date().toISOString()
    const items = await getCompanyDaily({})
    const dataDate = items[0]?.date ?? null
    return { asOf, dataDate, items }
  }
)
