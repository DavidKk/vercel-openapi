import { z } from 'zod'

import { reverseGeocode as geoReverseGeocode } from '@/app/actions/geo'
import { tool } from '@/initializer/mcp'

const name = 'reverse_geocode'
const description = 'Get geographic location information by latitude and longitude, only supports mainland China'
const paramsSchema = z.object({
  latitude: z.number().describe('Latitude coordinate'),
  longitude: z.number().describe('Longitude coordinate'),
})

export default tool(name, description, paramsSchema, async (params) => {
  const { latitude, longitude } = params
  const result = await geoReverseGeocode(latitude, longitude)
  return result
})
