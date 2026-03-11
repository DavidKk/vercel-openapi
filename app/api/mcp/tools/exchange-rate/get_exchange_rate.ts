import { z } from 'zod'

import { getCachedExchangeRate } from '@/app/actions/exchange-rate/api'
import { tool } from '@/initializer/mcp'

/** MCP tool: get current exchange rates for a base currency (default USD) */
export const get_exchange_rate = tool(
  'get_exchange_rate',
  'Get current exchange rates for a base currency (default USD). Returns base, date, and rates object.',
  z.object({
    base: z.string().optional().default('USD').describe('Base currency code (e.g. USD)'),
  }),
  async (params) => {
    const base = (params as { base?: string }).base ?? 'USD'
    const data = await getCachedExchangeRate(base)
    return data
  }
)
