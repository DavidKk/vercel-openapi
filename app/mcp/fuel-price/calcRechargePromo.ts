import { z } from 'zod'

import { getCachedProvinceFuelPrice } from '@/app/actions/fuel-price/api'
import { calcRechargePromo as calculateRechargePromo } from '@/app/actions/fuel-price/promo'
import { type FuelPriceData, isFuelType } from '@/app/actions/fuel-price/types'
import { tool } from '@/initializer/mcp'

const name = 'calc_recharge_promo'
const description = 'Calculate fuel recharge promotion for a specified province'
const paramSchema = z.object({
  province: z.string().describe('Province name, e.g.: Beijing, Shanghai, Guangdong'),
  fuelType: z.enum(['b92', 'b95', 'b98', 'b0']).optional().default('b92').describe('Fuel type: b92, b95, b98, b0'),
  amount: z.number().positive().describe('Recharge amount in yuan'),
  bonus: z.number().nonnegative().describe('Bonus amount in yuan'),
})

export default tool(name, description, paramSchema, async (params) => {
  const { province, fuelType = 'b92', amount, bonus } = params

  // Validate fuel type parameter
  if (!isFuelType(fuelType)) {
    throw new Error(`Invalid fuelType: ${fuelType}. Must be one of: b92, b95, b98, b0`)
  }

  // Get province fuel price data
  const fuelPriceData = await getCachedProvinceFuelPrice(province)
  if (!fuelPriceData.current) {
    throw new Error(`No fuel price data found for province: ${province}`)
  }

  // Get current fuel price
  const price = parseFloat(fuelPriceData.current[fuelType as keyof FuelPriceData])
  if (isNaN(price) || price <= 0) {
    throw new Error(`Invalid price for fuel type ${fuelType} in province ${province}`)
  }

  const resultData = calculateRechargePromo(price, amount, bonus)

  return {
    ...resultData,
    province: fuelPriceData.current.province,
    fuelType,
    pricePerLiter: price,
    amount,
    latestUpdated: fuelPriceData.latestUpdated,
  }
})
