import { z } from 'zod'

import { tool } from '@/initializer/mcp'
import { getSummaryDaily } from '@/services/finance/tasi'

/**
 * MCP tool: get market summary (Finance / TASI). No params = today; date = that day; from+to = market K-line.
 */
export const get_tasi_summary_daily = tool(
  'get_tasi_summary_daily',
  'Get market summary (TASI). No params = today; date (YYYY-MM-DD) = that day; from + to = market K-line (array).',
  z.object({
    date: z.string().optional().describe('Single date YYYY-MM-DD'),
    from: z.string().optional().describe('Start date YYYY-MM-DD for K-line'),
    to: z.string().optional().describe('End date YYYY-MM-DD for K-line'),
  }),
  async (params) => {
    const data = await getSummaryDaily({
      date: params.date,
      from: params.from ?? undefined,
      to: params.to ?? undefined,
    })
    return data
  }
)
