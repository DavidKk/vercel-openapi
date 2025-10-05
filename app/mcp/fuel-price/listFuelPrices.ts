import { z } from 'zod'

import { getCachedFuelPrice } from '@/app/actions/fuel-price/api'
import { tool } from '@/initializer/mcp'

const name = 'list_fuel_prices'
const description = 'Get fuel price list for all provinces and cities in China'
const paramsSchema = z.object({})

export default tool(name, description, paramsSchema, () => {
  return getCachedFuelPrice()
})
