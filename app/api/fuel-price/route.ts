import { getCachedFuelPrice } from '@/app/actions/fuel-price/api'
import { api } from '@/initializer/controller'
import { jsonSuccess } from '@/initializer/response'

export const runtime = 'edge'

export const GET = api(async () => {
  const fuelPriceData = await getCachedFuelPrice()

  return jsonSuccess(fuelPriceData, {
    headers: new Headers({
      'Content-Type': 'application/json',
      'Cache-Control': 's-maxage=3600, stale-while-revalidate=300', // 1 hour cache
    }),
  })
})
