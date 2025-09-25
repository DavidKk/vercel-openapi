import { api } from '@/initializer/controller'
import { jsonSuccess, invalidParameters } from '@/initializer/response'
import { getCachedProvinceFuelPrice } from '@/app/actions/fuel-price/api'
import { calcRechargePromo } from '@/app/actions/fuel-price/promo'
import { isFuelType, type FuelPriceData } from '@/app/actions/fuel-price/types'

export const runtime = 'edge'

/**
 * Calculate fuel recharge promotion
 * @param province Province name
 * @param fuelType Fuel type (b92, b95, b98, b0), default is b92
 * @param amount Recharge amount (required)
 */
export const GET = api<{ province: string }>(async (_, context) => {
  const { province } = await context.params
  const fuelType = context.searchParams.get('fuelType') || 'b92'
  const amount = context.searchParams.get('amount')
  const bonus = context.searchParams.get('bonus')

  // Validate fuel type parameter
  if (!isFuelType(fuelType)) {
    return invalidParameters(`Invalid fuelType: ${fuelType}. Must be one of: b92, b95, b98, b0`).toJsonResponse(400)
  }

  // Validate recharge amount parameter
  if (!amount) {
    return invalidParameters('amount is required').toJsonResponse(400)
  }

  if (!bonus) {
    return invalidParameters('bonus is required').toJsonResponse(400)
  }

  const amountNum = parseFloat(amount)
  if (isNaN(amountNum) || amountNum <= 0) {
    return invalidParameters(`Invalid amount: ${amount}. Must be a positive number`).toJsonResponse(400)
  }

  const bonusNum = parseFloat(bonus)
  if (isNaN(bonusNum) || bonusNum < 0) {
    return invalidParameters(`Invalid bonus: ${bonus}. Must be a positive number`).toJsonResponse(400)
  }

  // Get province fuel price data
  const fuelPriceData = await getCachedProvinceFuelPrice(province)
  if (!fuelPriceData.current) {
    return invalidParameters(`No fuel price data found for province: ${province}`).toJsonResponse(404)
  }

  // Get current fuel price
  const price = parseFloat(fuelPriceData.current[fuelType as keyof FuelPriceData])
  if (isNaN(price) || price <= 0) {
    return invalidParameters(`Invalid price for fuel type ${fuelType} in province ${province}`).toJsonResponse(400)
  }

  const resultData = calcRechargePromo(price, amountNum, bonusNum)
  return jsonSuccess(
    {
      ...resultData,
      province: fuelPriceData.current.province,
      fuelType,
      pricePerLiter: price,
      amount: amountNum,
      latestUpdated: fuelPriceData.latestUpdated,
    },
    {
      headers: new Headers({
        'Content-Type': 'application/json',
        'Cache-Control': 's-maxage=3600, stale-while-revalidate=300',
      }),
    }
  )
})
