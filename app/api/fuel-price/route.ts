import { getCachedFuelPrice } from '@/app/actions/fuel-price/api'
import { api } from '@/initializer/controller'
import { jsonSuccess } from '@/initializer/response'

export const runtime = 'edge'

/**
 * GET handler for fuel price API endpoint
 * Returns current fuel prices for all provinces with caching
 */
export const GET = api(async () => {
  const fuelPriceData = await getCachedFuelPrice()

  return jsonSuccess(fuelPriceData, {
    headers: new Headers({
      Charset: 'utf-8',
      'Content-Type': 'application/json',
      'Cache-Control': 's-maxage=3600, stale-while-revalidate=300', // 1 hour cache
    }),
  })
})
