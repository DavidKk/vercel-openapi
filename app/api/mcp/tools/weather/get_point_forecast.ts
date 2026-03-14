import { z } from 'zod'

import { getPointWeatherForecast } from '@/app/actions/weather'
import { tool } from '@/initializer/mcp'

/** MCP tool: get short-term forecast for a specific point (latitude/longitude). */
export const get_point_forecast = tool(
  'get_point_forecast',
  'Get short-term weather forecast for a specific point (latitude/longitude). Supports hourly or daily granularity.',
  z.object({
    latitude: z.number().describe('Latitude in decimal degrees'),
    longitude: z.number().describe('Longitude in decimal degrees'),
    granularity: z.enum(['hourly', 'daily']).optional().default('hourly').describe('Forecast granularity: hourly or daily (default hourly)'),
    hours: z.number().optional().describe('Optional number of hours for hourly forecast (e.g. 1-24). Ignored for daily granularity.'),
    days: z.number().optional().describe('Optional number of days for daily forecast (e.g. 1-7). Reserved for future daily implementation.'),
  }),
  async (params) => {
    const {
      latitude,
      longitude,
      granularity = 'hourly',
      hours,
      days,
    } = params as {
      latitude: number
      longitude: number
      granularity?: 'hourly' | 'daily'
      hours?: number
      days?: number
    }

    const data = await getPointWeatherForecast(latitude, longitude, granularity, hours, days)
    return data
  }
)
