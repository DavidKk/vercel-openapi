import { z } from 'zod'

import { convertCurrency } from '@/app/actions/exchange-rate/api'
import { tool } from '@/initializer/mcp'

/** MCP tool: convert amount from one currency to another */
export const convert_currency = tool(
  'convert_currency',
  'Convert an amount from one currency to another. Returns result, rate, and date.',
  z.object({
    from: z.string().describe('Source currency code (e.g. USD)'),
    to: z.string().describe('Target currency code (e.g. EUR)'),
    amount: z.number().positive().describe('Amount to convert'),
  }),
  async (params) => {
    const result = await convertCurrency({
      from: params.from,
      to: params.to,
      amount: params.amount,
    })
    return result
  }
)
