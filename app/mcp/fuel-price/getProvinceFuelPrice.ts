import { z } from 'zod'

import { getCachedProvinceFuelPrice } from '@/app/actions/fuel-price/api'
import { tool } from '@/initializer/mcp'

const name = 'get_province_fuel_price'
const description = 'Get fuel price for a specified province'
const paramSchema = z.object({
  province: z.string().describe('Province name, e.g.: Beijing, Shanghai, Guangdong'),
})

export default tool(name, description, paramSchema, async (params) => {
  const { province } = params
  const fuelPriceData = await getCachedProvinceFuelPrice(province)
  return fuelPriceData
})
