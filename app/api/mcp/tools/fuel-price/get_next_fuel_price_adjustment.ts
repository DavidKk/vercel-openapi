import { z } from 'zod'

import { getCachedFuelPrice } from '@/app/actions/fuel-price/api'
import { tool } from '@/initializer/mcp'

/** MCP tool: get the next scheduled fuel price adjustment date (China) */
export const get_next_fuel_price_adjustment = tool(
  'get_next_fuel_price_adjustment',
  'Get the next scheduled fuel price adjustment date (China) from cached fuel price data.',
  z.object({}),
  async () => {
    const data = await getCachedFuelPrice()

    return {
      nextAdjustmentDate: data.nextAdjustmentDate ?? null,
      latestUpdated: data.latestUpdated,
    }
  }
)
