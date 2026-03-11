import { z } from 'zod'

import { getCachedProvinceFuelPrice } from '@/app/actions/fuel-price/api'
import { calcRechargePromo } from '@/app/actions/fuel-price/promo'
import type { FuelPriceData } from '@/app/actions/fuel-price/types'
import { isFuelType } from '@/app/actions/fuel-price/types'
import { tool } from '@/initializer/mcp'

/** MCP tool: calculate fuel recharge promotion for a province */
export const calc_fuel_recharge_promo = tool(
  'calc_fuel_recharge_promo',
  'Calculate fuel recharge promotion for a province: pay amount, bonus, effective price, liters, and savings.',
  z.object({
    province: z.string().describe('Province name (e.g. 北京, 上海)'),
    amount: z.number().positive().describe('Recharge pay amount (yuan)'),
    bonus: z.number().min(0).describe('Bonus amount (yuan)'),
    fuelType: z.enum(['b92', 'b95', 'b98', 'b0']).optional().default('b92').describe('Fuel type'),
  }),
  async (params) => {
    const fuelPriceData = await getCachedProvinceFuelPrice(params.province)
    if (!fuelPriceData.current) {
      throw new Error(`No fuel price data found for province: ${params.province}`)
    }
    const fuelType = params.fuelType
    if (!isFuelType(fuelType)) {
      throw new Error(`Invalid fuelType: ${fuelType}. Must be one of: b92, b95, b98, b0`)
    }
    const price = parseFloat((fuelPriceData.current as FuelPriceData)[fuelType])
    if (isNaN(price) || price <= 0) {
      throw new Error(`Invalid price for fuel type ${fuelType} in province ${params.province}`)
    }
    const resultData = calcRechargePromo(price, params.amount, params.bonus)
    return {
      ...resultData,
      province: fuelPriceData.current.province,
      fuelType,
      pricePerLiter: price,
      amount: params.amount,
      latestUpdated: fuelPriceData.latestUpdated,
    }
  }
)
