/**
 * Weather API: scope is deployment-specific (e.g. a region or country). Unsupported locations return an error.
 * Used by API routes only (no server action); enables route-level caching.
 */

import { type GeoLocation, reverseGeocode } from '@/services/china-geo'
import { getRegionKey } from '@/services/china-geo/cache'
import { createLogger } from '@/services/logger'
import { createLruCache } from '@/services/lru-cache'
import { getCachedTurso, setCachedTurso } from '@/services/weather/turso-cache'

import type { ForecastHour, WeatherForecastResponse, WeatherLocation, WeatherNowResponse } from './types'

/** Cached entry: timestamp for TTL, data for response. */
interface WeatherCacheEntry {
  timestamp: number
  data: unknown
}

/**
 * Max weather entries in memory (LRU eviction). Key = region (province/city/district from geo),
 * so one region shares one cache entry and hit rate is high. TTL 5–30 min.
 */
const WEATHER_LRU_MAX_SIZE = 500

const WEATHER_CACHE = createLruCache<string, WeatherCacheEntry>(WEATHER_LRU_MAX_SIZE)

/** QWeather v7 real-time weather (/v7/weather/now). */
interface QWeatherNowResponse {
  code: string
  updateTime: string
  now: {
    obsTime: string
    temp: string
    feelsLike: string
    icon: string
    text: string
    windDir?: string
    windScale?: string
    windSpeed?: string
    humidity?: string
    precip?: string
    pressure?: string
    vis?: string
    cloud?: string
    dew?: string
  }
}

interface QWeatherHourlyResponse {
  code: string
  updateTime: string
  hourly: Array<{
    fxTime: string
    temp: string
    text: string
    icon: string
    humidity?: string
    pop?: string
    precip?: string
  }>
}

/** QWeather API base (v7). Use /now for real-time, /24h for hourly forecast. Host from QWeather console. */
const QWEATHER_BASE_URL = 'https://p57qqt8guf.re.qweatherapi.com/v7/weather'

const NOW_CACHE_TTL = 5 * 60 * 1000
const FORECAST_CACHE_TTL = 30 * 60 * 1000

const logger = createLogger('weather-api')

/**
 * Build cache key by region (from reverseGeocode). One region = one cache entry for that type.
 * @param type 'now' | 'forecast'
 * @param geoLocation First location from reverseGeocode (province/city/district)
 * @param extra Optional suffix for forecast (e.g. granularity:hours:days)
 */
function buildWeatherCacheKey(type: 'now' | 'forecast', geoLocation: GeoLocation, extra?: string): string {
  const regionKey = getRegionKey(geoLocation)
  return extra ? `${type}:${regionKey}:${extra}` : `${type}:${regionKey}`
}

/**
 * Get latest "now" weather for a specific point using QWeather v7 real-time API with caching.
 * @param latitude Latitude in decimal degrees
 * @param longitude Longitude in decimal degrees
 * @returns Normalized weather "now" response
 */
export async function getPointWeatherNow(latitude: number, longitude: number): Promise<WeatherNowResponse> {
  const geoLocation = await reverseGeocode(latitude, longitude)
  if (!geoLocation) {
    throw new Error('This area is not supported for this service.')
  }

  const cacheKey = buildWeatherCacheKey('now', geoLocation)
  const nowTs = Date.now()
  const cachedL1 = WEATHER_CACHE.get(cacheKey)
  if (cachedL1 && nowTs - cachedL1.timestamp < NOW_CACHE_TTL) {
    return cachedL1.data as WeatherNowResponse
  }

  const cachedL2 = await getCachedTurso(cacheKey, NOW_CACHE_TTL)
  if (cachedL2) {
    WEATHER_CACHE.set(cacheKey, cachedL2)
    return cachedL2.data as WeatherNowResponse
  }

  const apiKey = process.env.QWEATHER_API_KEY
  if (!apiKey) {
    throw new Error('QWEATHER_API_KEY is not configured')
  }

  const locationParam = `${longitude.toFixed(2)},${latitude.toFixed(2)}`
  const url = `${QWEATHER_BASE_URL}/now?location=${encodeURIComponent(locationParam)}&key=${encodeURIComponent(apiKey)}&unit=m`

  const response = await fetch(url, {
    method: 'GET',
    headers: { Accept: 'application/json' },
    cache: 'no-store',
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch weather now from QWeather: ${response.status}`)
  }

  const data = (await response.json()) as QWeatherNowResponse
  if (data.code !== '200' || !data.now) {
    throw new Error('QWeather returned invalid or empty now data')
  }

  const n = data.now
  const location: WeatherLocation = {
    latitude,
    longitude,
    province: geoLocation.province,
    city: geoLocation.city,
    district: geoLocation.district,
    ...(geoLocation.town && { town: geoLocation.town }),
  }

  const payload: WeatherNowResponse = {
    location,
    now: {
      observedAt: n.obsTime,
      condition: n.icon,
      conditionText: n.text,
      temperature: Number.parseFloat(n.temp),
      feelsLike: n.feelsLike ? Number.parseFloat(n.feelsLike) : undefined,
      humidity: n.humidity ? Number.parseFloat(n.humidity) : undefined,
      windSpeed: n.windSpeed ? Number.parseFloat(n.windSpeed) : undefined,
      windDirection: n.windDir,
    },
  }

  const entry = { timestamp: nowTs, data: payload }
  await setCachedTurso(cacheKey, entry)
  WEATHER_CACHE.set(cacheKey, entry)

  logger.info('weather now resolved', {
    input: { latitude, longitude },
    geoLocation,
    provider: 'qweather',
    cacheKey,
  })

  return payload
}

/**
 * Get short-term forecast for a specific point using QWeather v7 hourly API with caching.
 * @param latitude Latitude in decimal degrees
 * @param longitude Longitude in decimal degrees
 * @param granularity Forecast granularity ("hourly" | "daily")
 * @param hours Optional number of hours (1-24) for hourly forecast
 * @param days Optional number of days for daily forecast (reserved for future use)
 * @returns Normalized weather forecast response
 */
export async function getPointWeatherForecast(
  latitude: number,
  longitude: number,
  granularity: 'hourly' | 'daily' = 'hourly',
  hours?: number,
  days?: number
): Promise<WeatherForecastResponse> {
  const geoLocation = await reverseGeocode(latitude, longitude)
  if (!geoLocation) {
    throw new Error('This area is not supported for this service.')
  }

  const extraKey = `${granularity}:${hours ?? ''}:${days ?? ''}`
  const cacheKey = buildWeatherCacheKey('forecast', geoLocation, extraKey)
  const nowTs = Date.now()
  const cachedL1 = WEATHER_CACHE.get(cacheKey)
  if (cachedL1 && nowTs - cachedL1.timestamp < FORECAST_CACHE_TTL) {
    return cachedL1.data as WeatherForecastResponse
  }

  const cachedL2 = await getCachedTurso(cacheKey, FORECAST_CACHE_TTL)
  if (cachedL2) {
    WEATHER_CACHE.set(cacheKey, cachedL2)
    return cachedL2.data as WeatherForecastResponse
  }

  const apiKey = process.env.QWEATHER_API_KEY

  if (!apiKey) {
    throw new Error('QWEATHER_API_KEY is not configured')
  }

  if (granularity === 'daily') {
    throw new Error('Daily forecast via QWeather is not implemented')
  }

  const locationParam = `${longitude.toFixed(2)},${latitude.toFixed(2)}`
  const url = `${QWEATHER_BASE_URL}/24h?location=${encodeURIComponent(locationParam)}&key=${encodeURIComponent(apiKey)}&unit=m`

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
    },
    cache: 'no-store',
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch weather forecast from QWeather: ${response.status}`)
  }

  const data = (await response.json()) as QWeatherHourlyResponse

  if (!data.hourly || !Array.isArray(data.hourly) || data.hourly.length === 0) {
    throw new Error('QWeather returned empty hourly forecast')
  }

  const location: WeatherLocation = {
    latitude,
    longitude,
    province: geoLocation.province,
    city: geoLocation.city,
    district: geoLocation.district,
    ...(geoLocation.town && { town: geoLocation.town }),
  }

  const allHours = data.hourly
  const takeCount = typeof hours === 'number' && hours > 0 ? Math.min(hours, allHours.length) : allHours.length
  const sliced = allHours.slice(0, takeCount)

  const hourly: ForecastHour[] = sliced.map((h) => ({
    time: h.fxTime,
    temperature: Number.parseFloat(h.temp),
    condition: h.icon,
    conditionText: h.text,
    precipitation: h.precip ? Number.parseFloat(h.precip) : undefined,
    precipitationProbability: h.pop ? Number.parseFloat(h.pop) : undefined,
    humidity: h.humidity ? Number.parseFloat(h.humidity) : undefined,
  }))

  const payload: WeatherForecastResponse = {
    location,
    forecast: {
      granularity: 'hourly',
      hours: hourly,
      days: undefined,
      meta: {
        providerStatus: 200,
        providerMessage: 'Forecast data from QWeather hourly API (v7)',
      },
    },
  }

  const entry = { timestamp: nowTs, data: payload }
  await setCachedTurso(cacheKey, entry)
  WEATHER_CACHE.set(cacheKey, entry)

  logger.info('weather forecast resolved', {
    input: { latitude, longitude, granularity, hours, days },
    geoLocation,
    providerLocation: { source: 'qweather', updateTime: data.updateTime, urlUsed: url },
    cacheKey,
    sampleHours: hourly.slice(0, 3).map((h) => ({ time: h.time, temperature: h.temperature })),
  })

  return payload
}
