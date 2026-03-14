import { z } from 'zod'

import { getPointWeatherNow } from '@/app/actions/weather'
import { tool } from '@/initializer/mcp'

/** MCP tool: get current point-based weather (now) for a specific latitude/longitude */
export const get_point_weather = tool(
  'get_point_weather',
  'Get current "now" weather for a specific point (latitude/longitude). Returns normalized location and now fields.',
  z.object({
    latitude: z.number().describe('Latitude in decimal degrees'),
    longitude: z.number().describe('Longitude in decimal degrees'),
  }),
  async (params) => {
    const { latitude, longitude } = params as { latitude: number; longitude: number }
    const data = await getPointWeatherNow(latitude, longitude)
    return data
  }
)
