import { z } from 'zod'

import { tool } from '@/initializer/mcp'
import { getCompanyDaily } from '@/services/finance/tasi'

/**
 * MCP tool: get company daily (Finance / TASI). No params = today all companies; date = that day; code+from+to = company K-line.
 */
export const get_tasi_company_daily = tool(
  'get_tasi_company_daily',
  'Get company daily (TASI). Returns array. No params = today all companies; date (YYYY-MM-DD) = that day; code + from + to = company K-line for that code in date range.',
  z.object({
    date: z.string().optional().describe('Single date YYYY-MM-DD'),
    code: z.string().optional().describe('Company code for K-line (use with from and to)'),
    from: z.string().optional().describe('Start date YYYY-MM-DD for K-line'),
    to: z.string().optional().describe('End date YYYY-MM-DD for K-line'),
  }),
  async (params) => {
    const list = await getCompanyDaily({
      date: params.date,
      code: params.code ?? undefined,
      from: params.from ?? undefined,
      to: params.to ?? undefined,
    })
    return list
  }
)
