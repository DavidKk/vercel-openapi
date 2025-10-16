import { reverseGeocode as geoReverseGeocode } from '@/app/actions/geo'
import { api } from '@/initializer/controller'
import { jsonSuccess } from '@/initializer/response'

// 改回 Edge Runtime
export const runtime = 'edge'

export const POST = api(async (req) => {
  const { latitude, longitude } = await req.json()

  if (typeof latitude !== 'number' || typeof longitude !== 'number') {
    return jsonSuccess({ error: 'Invalid latitude or longitude' }, { status: 400 })
  }

  const result = await geoReverseGeocode(latitude, longitude)

  if (!result) {
    return jsonSuccess({ error: 'Location not found or not in mainland China' }, { status: 404 })
  }

  return jsonSuccess(result)
})
