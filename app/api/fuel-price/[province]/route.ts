import { getCachedProvinceFuelPrice } from '@/app/actions/fuel-price/api'
import { api } from '@/initializer/controller'
import { jsonSuccess } from '@/initializer/response'

export const runtime = 'edge'

export const GET = api<{ province: string }>(async (_, context) => {
  const { province } = await context.params
  const fuelPriceData = await getCachedProvinceFuelPrice(province)

  return jsonSuccess(fuelPriceData, {
    headers: new Headers({
      'Content-Type': 'application/json',
      'Cache-Control': 's-maxage=3600, stale-while-revalidate=300', // 1 hour cache
    }),
  })
})
