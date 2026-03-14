/**
 * Browser-only IndexedDB cache for weather API responses (forecast, and optionally "now").
 * Key = region-based (e.g. forecast:regionKey:hourly:6). TTL 30 min forecast, 5 min now.
 * Same caching strategy can be extended to other regions/countries.
 * Do not import from API routes or server code (no window).
 */

import type { WeatherForecastResponse } from '@/app/actions/weather/types'
import { createIdbCache } from '@/services/idb-cache'

const DB_NAME = 'unbnd-weather'
const STORE_FORECAST = 'forecast'
/** Forecast TTL 30 minutes (align with server L1/L2). */
const FORECAST_TTL_MS = 30 * 60 * 1000

const forecastCache = createIdbCache<WeatherForecastResponse>(DB_NAME, STORE_FORECAST, FORECAST_TTL_MS)

/**
 * Get cached forecast from IndexedDB by request key. Returns null on miss or when past TTL.
 *
 * @param requestKey Region-based key (e.g. forecast:regionKey:hourly:6)
 * @returns Cached forecast data or null
 */
export async function getWeatherForecastFromIdb(requestKey: string): Promise<WeatherForecastResponse | null> {
  return forecastCache.get(requestKey)
}

/**
 * Store forecast in IndexedDB. Call after a successful API response.
 *
 * @param requestKey Region-based key (same as getWeatherForecastFromIdb)
 * @param data Forecast response data from API
 */
export async function setWeatherForecastInIdb(requestKey: string, data: WeatherForecastResponse): Promise<void> {
  await forecastCache.set(requestKey, data)
}
