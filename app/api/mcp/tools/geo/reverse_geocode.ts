import { z } from 'zod'

import { tool } from '@/initializer/mcp'
import { reverseGeocodeWithMeta } from '@/services/china-geo'

/**
 * MCP tool: reverse geocode a latitude/longitude point in mainland China.
 */
export const reverse_geocode = tool(
  'reverse_geocode',
  'Reverse geocode latitude and longitude to mainland China province/city/district. Returns 404-style error when point is outside supported coverage.',
  z.object({
    latitude: z.number().min(-90).max(90).describe('Latitude in decimal degrees (-90 to 90)'),
    longitude: z.number().min(-180).max(180).describe('Longitude in decimal degrees (-180 to 180)'),
  }),
  async (params) => {
    const { location } = await reverseGeocodeWithMeta(params.latitude, params.longitude)
    if (!location) {
      return {
        error: 'This area is not supported for this service.',
        status: 404,
      }
    }
    if (!location.polygon) {
      return {
        error: 'Geo RPC must return polygon (real boundary).',
        status: 503,
      }
    }
    return location
  }
)
