import { z } from 'zod'

import { getCachedFuelPrice } from '@/app/actions/fuel-price/api'
import { tool } from '@/initializer/mcp'

/** MCP tool: get current fuel prices for all provinces (China) */
export const get_fuel_price = tool(
  'get_fuel_price',
  'Get current fuel prices for all provinces (China). Returns previous/current arrays and timestamps.',
  z.object({}),
  async () => {
    const data = await getCachedFuelPrice()
    return data
  }
)
