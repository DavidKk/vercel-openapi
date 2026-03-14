'use client'

import { useRequest } from 'ahooks'
import { useEffect, useRef, useState } from 'react'
import {
  WiDayCloudy,
  WiDayFog,
  WiDayRain,
  WiDaySnow,
  WiDaySunny,
  WiDayThunderstorm,
  WiHumidity,
  WiNightClear,
  WiNightCloudy,
  WiNightFog,
  WiNightRain,
  WiNightSnow,
  WiNightThunderstorm,
} from 'react-icons/wi'

import { useDebugPanel } from '@/components/DebugPanel'
import { getGeoForPoint } from '@/services/china-geo/browser'
import { getRegionKey } from '@/services/china-geo/region-key'
import { withSingletonRequest } from '@/services/fetch/browser'
import { getWeatherForecastFromIdb, setWeatherForecastInIdb } from '@/services/weather/browser'

interface WeatherLocation {
  latitude: number
  longitude: number
  country?: string
  province?: string
  city?: string
  district?: string
  town?: string
  name?: string
}

interface ForecastHour {
  time: string
  temperature: number
  condition: string
  conditionText: string
  precipitation?: number
  precipitationProbability?: number
  humidity?: number
}

interface WeatherForecastResponse {
  location: WeatherLocation
  forecast: {
    granularity: 'hourly' | 'daily'
    hours?: ForecastHour[]
  }
}

interface ApiSuccessResponse<T> {
  code: number
  message: string
  data: T
}

/** Hour 0–23; night is 18:00–05:59 (6pm to 6am). */
function isNightHour(hour: number): boolean {
  return hour >= 18 || hour < 6
}

const iconClass = 'h-8 w-8'

/**
 * Resolve weather condition to day or night icon.
 * @param condition API condition code
 * @param conditionText Human-readable condition (e.g. "晴", "多云")
 * @param hour Hour of day 0–23 for day/night variant (night: 18–05)
 * @returns Icon element for the condition
 */
function getConditionIcon(condition: string, conditionText: string, hour: number) {
  const text = conditionText.toLowerCase()
  const night = isNightHour(hour)

  if (text.includes('雷')) {
    return night ? <WiNightThunderstorm className={iconClass} /> : <WiDayThunderstorm className={iconClass} />
  }
  if (text.includes('雨')) {
    return night ? <WiNightRain className={iconClass} /> : <WiDayRain className={iconClass} />
  }
  if (text.includes('雪')) {
    return night ? <WiNightSnow className={iconClass} /> : <WiDaySnow className={iconClass} />
  }
  if (text.includes('雾') || text.includes('霾')) {
    return night ? <WiNightFog className={iconClass} /> : <WiDayFog className={iconClass} />
  }
  if (text.includes('云') || text.includes('阴')) {
    return night ? <WiNightCloudy className={iconClass} /> : <WiDayCloudy className={iconClass} />
  }
  if (text.includes('晴')) {
    return night ? <WiNightClear className={iconClass} /> : <WiDaySunny className={iconClass} />
  }

  if (condition.startsWith('3') || condition.startsWith('4')) {
    return night ? <WiNightRain className={iconClass} /> : <WiDayRain className={iconClass} />
  }

  return night ? <WiNightClear className={iconClass} /> : <WiDaySunny className={iconClass} />
}

/** Region line skeleton: 16px height to match real region line and avoid layout shift. */
function RegionSkeleton() {
  return (
    <div className="h-4 shrink-0 text-xs text-gray-500">
      <span className="inline-block h-4 w-36 animate-pulse rounded bg-gray-200" aria-hidden />
    </div>
  )
}

/** Skeleton cards: each column 160×112px to match real forecast card content. */
function ForecastSkeleton() {
  return (
    <div className="w-full shrink-0 rounded-2xl border border-gray-100 bg-white px-4 py-3 shadow-sm">
      <div className="flex w-full items-stretch gap-4 overflow-x-auto pb-1">
        {[0, 1, 2, 3, 4, 5].map((idx) => (
          <div key={idx} className="flex h-[112px] w-40 min-w-[160px] flex-col justify-between text-center" style={{ animationDelay: `${idx * 80}ms` }}>
            <div className="flex justify-center">
              <span className="inline-block h-4 w-20 animate-pulse rounded bg-gray-200" style={{ animationDelay: `${idx * 80}ms` }} />
            </div>
            <div className="flex items-center justify-center gap-3">
              <span className="inline-block h-10 w-10 shrink-0 animate-pulse rounded-full bg-gray-200" style={{ animationDelay: `${idx * 80 + 40}ms` }} />
              <div className="flex flex-col items-start justify-center gap-1 text-left">
                <span className="inline-block h-8 w-14 animate-pulse rounded bg-gray-200" style={{ animationDelay: `${idx * 80 + 20}ms` }} />
                <span className="inline-block h-3 w-8 animate-pulse rounded bg-gray-100" style={{ animationDelay: `${idx * 80 + 60}ms` }} />
              </div>
            </div>
            <div className="flex justify-center">
              <span className="inline-block h-3 w-10 animate-pulse rounded bg-gray-100" style={{ animationDelay: `${idx * 80 + 100}ms` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/** Forecast cache key by region (same idea as geo and server weather LRU). No per-point keys. */
const FORECAST_HOURS = 6

/**
 * Fetch forecast: resolve geo by region → L0 IndexedDB (by region key) → singleton → API; on success write to IDB.
 * Cache key is region-based only (province/city/district or ids), not lat/lng.
 */
async function fetchForecastForPoint(latitude: number, longitude: number): Promise<WeatherForecastResponse> {
  const geo = await getGeoForPoint(latitude, longitude)
  if (!geo) {
    throw new Error('This area is not supported for this service.')
  }
  const regionKey = getRegionKey(geo)
  const requestKey = `forecast:${regionKey}:hourly:${FORECAST_HOURS}`

  const fromIdb = await getWeatherForecastFromIdb(requestKey)
  if (fromIdb) return fromIdb

  return withSingletonRequest(requestKey, async () => {
    const res = await fetch('/api/weather/forecast', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        latitude,
        longitude,
        granularity: 'hourly' as const,
        hours: FORECAST_HOURS,
      }),
    })
    if (!res.ok) {
      const text = await res.text()
      throw new Error(`Forecast request failed (${res.status}): ${text}`)
    }
    const envelope = (await res.json()) as ApiSuccessResponse<WeatherForecastResponse>
    const data = envelope.data
    await setWeatherForecastInIdb(requestKey, data)
    return data
  })
}

export function WeatherOverview() {
  const [coordsDisplay, setCoordsDisplay] = useState<{ lat: string; lng: string } | null>(null)
  const [geoError, setGeoError] = useState<string | null>(null)
  /** True from mount until getCurrentPosition resolves (success or error); ensures loading UI shows while waiting for location. */
  const [locationPending, setLocationPending] = useState(true)
  const hasTriggeredRef = useRef(false)

  const {
    data: forecast,
    loading,
    error: requestError,
    run: runForecast,
  } = useRequest((latitude: number, longitude: number) => fetchForecastForPoint(latitude, longitude), {
    manual: true,
  })

  useEffect(() => {
    if (hasTriggeredRef.current) return
    hasTriggeredRef.current = true

    if (!navigator.geolocation) {
      setGeoError('Geolocation is not supported in this browser')
      setLocationPending(false)
      return
    }

    setGeoError(null)

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocationPending(false)
        const { latitude, longitude } = position.coords
        setCoordsDisplay({ lat: latitude.toFixed(5), lng: longitude.toFixed(5) })
        runForecast(latitude, longitude)
      },
      (err) => {
        setLocationPending(false)
        if (err.code === err.PERMISSION_DENIED) {
          setGeoError('Location access was denied. Please enable location access for this site to view current weather.')
        } else {
          setGeoError('Failed to get current location. Please ensure location access is enabled.')
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 5 * 60 * 1000,
      }
    )
  }, [runForecast])

  const debug = useDebugPanel()
  const forceLoading = debug?.forceLoading ?? false
  const forceError = debug?.forceError ?? null

  const error = forceError ?? geoError ?? (requestError ? (requestError as Error).message : null)
  /** Loading: waiting for location, or forecast request in flight, or debug force. */
  const showLoading = forceLoading || locationPending || loading
  const hasForecast = !forceLoading && !forceError && Boolean(forecast?.forecast?.hours?.length)
  const baseHour = new Date().getHours()

  return (
    <div className="flex h-full w-full flex-col p-4 text-sm text-gray-800">
      <div className="flex min-h-0 flex-1 flex-col gap-3">
        {(forecast?.location ?? coordsDisplay) && !forceLoading && !forceError ? (
          <div className="shrink-0 text-xs text-gray-500">
            {forecast?.location
              ? [forecast.location.province, forecast.location.city, forecast.location.district, forecast.location.town].filter(Boolean).join('，') ||
                `${forecast.location.latitude.toFixed(5)}, ${forecast.location.longitude.toFixed(5)}`
              : `${coordsDisplay!.lat}, ${coordsDisplay!.lng}`}
          </div>
        ) : showLoading ? (
          <RegionSkeleton />
        ) : null}

        {hasForecast ? (
          <div className="w-full shrink-0 rounded-2xl border border-gray-100 bg-white px-4 py-3">
            <div className="flex w-full items-stretch gap-4 overflow-x-auto pb-1 text-[11px] text-gray-700">
              {forecast!.forecast.hours!.slice(0, 6).map((h, idx) => {
                const labelHour = (baseHour + idx) % 24
                const label = idx === 0 ? 'Now' : `${labelHour.toString().padStart(2, '0')}:00`

                return (
                  <div key={`${h.time}-${idx}`} className="flex w-40 min-w-[160px] flex-col justify-between text-center">
                    <div className="flex justify-center">
                      <span className="text-[12px] font-semibold text-gray-900">{h.conditionText}</span>
                    </div>
                    <div className="mt-2 flex items-center justify-center gap-3">
                      <span className="text-4xl">{getConditionIcon(h.condition, h.conditionText, labelHour)}</span>
                      <div className="flex flex-col items-start gap-1 text-left">
                        <div className="text-2xl font-semibold text-gray-900">
                          {h.temperature.toFixed(0)}
                          <span className="align-top text-xs text-gray-500">°C</span>
                        </div>
                        {typeof h.humidity === 'number' && (
                          <span className="inline-flex items-center text-[11px] text-gray-600">
                            <WiHumidity className="mr-1 h-3 w-3" />
                            <span className="font-medium text-gray-900">{h.humidity.toFixed(0)}%</span>
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="mt-2 text-center text-[11px] text-gray-500">{label}</div>
                  </div>
                )
              })}
            </div>
          </div>
        ) : (
          <div className="flex min-h-0 flex-1 flex-col">
            {showLoading && (
              <div className="shrink-0">
                <ForecastSkeleton />
              </div>
            )}
            {!showLoading && (
              <div className="flex min-h-0 flex-1 flex-col items-center justify-center text-center text-[12px] text-gray-500">
                {error && <p className={error.includes('not supported for this service') ? 'text-base text-amber-700' : 'text-base text-red-600'}>{error}</p>}
                {!error && <p className="text-gray-500">Weather for the next few hours will appear here once your location is available and supported.</p>}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
