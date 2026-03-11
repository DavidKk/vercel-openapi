import { z } from 'zod'

import { getCachedProvinceFuelPrice } from '@/app/actions/fuel-price/api'
import { tool } from '@/initializer/mcp'

/** MCP tool: get fuel price for a specific province */
export const get_fuel_price_by_province = tool(
  'get_fuel_price_by_province',
  'Get fuel price for a specific province. Returns current and previous price data for that province.',
  z.object({
    province: z.string().describe('Province name (e.g. 北京, 上海)'),
  }),
  async (params) => {
    const data = await getCachedProvinceFuelPrice(params.province)
    return data
  }
)
