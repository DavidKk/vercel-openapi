import { z } from 'zod'

import { tool } from '@/initializer/mcp'
import { getTasiSummaryHourlyAlignment } from '@/services/finance/tasi/hourly-summary'

/**
 * MCP tool: get TASI summary hourly alignment (SAHMK vs current summary/daily mapping).
 */
export const get_tasi_summary_hourly = tool(
  'get_tasi_summary_hourly',
  'Get TASI summary hourly alignment. Pull SAHMK market summary and compare mapped fields with current summary/daily.',
  z.object({}),
  async () => {
    const data = await getTasiSummaryHourlyAlignment()
    return data
  }
)
