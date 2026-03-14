'use client'

import { memo, useCallback, useEffect, useRef, useState } from 'react'
import { TbMapPin } from 'react-icons/tb'

import { useDebugPanel } from '@/components/DebugPanel'
import { useGeocode } from '@/hooks/useGeocode'

import { RegionBoundary } from './RegionBoundary'

/** Text-based ellipsis cycle: "." → ".." → "..." . Memoized so parent re-renders do not reset the animation. */
const AnimatedEllipsis = memo(function AnimatedEllipsis() {
  const [dots, setDots] = useState(1)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setDots((d) => (d >= 3 ? 1 : d + 1))
    }, 400)
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [])

  return (
    <span className="inline-block min-w-[1.25em] text-left" aria-hidden>
      {'.'.repeat(dots)}
    </span>
  )
})

const PERMISSION_DENIED_MESSAGE =
  'Location access was denied. This page only uses your device location to show the district (address cannot be entered manually). Please enable location in your browser or device settings to continue.'

const MAP_HEIGHT = 240

export default function GeoClient() {
  const [getLocationError, setGetLocationError] = useState('')
  const { data, loading, error, geocode } = useGeocode()
  const debug = useDebugPanel()
  const hasTriggeredRef = useRef(false)

  const forceLoading = debug?.forceLoading ?? false
  const forceError = debug?.forceError ?? null
  const barError = forceError ?? (getLocationError || null)
  const showLoading = forceLoading || loading

  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setGetLocationError('Geolocation is not supported by your browser.')
      return
    }
    setGetLocationError('')
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords
        geocode(latitude, longitude)
      },
      (err) => {
        switch (err.code) {
          case err.PERMISSION_DENIED:
            setGetLocationError(PERMISSION_DENIED_MESSAGE)
            break
          case err.POSITION_UNAVAILABLE:
            setGetLocationError('Location information is unavailable. Please check your device.')
            break
          case err.TIMEOUT:
            setGetLocationError('Location request timed out. Please try again.')
            break
          default:
            setGetLocationError('An unknown error occurred while getting location.')
        }
      },
      { timeout: 10000, enableHighAccuracy: true }
    )
  }, [geocode])

  useEffect(() => {
    if (hasTriggeredRef.current) return
    hasTriggeredRef.current = true
    requestLocation()
  }, [requestLocation])

  return (
    <div className="flex h-full w-full flex-col bg-white">
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-3 py-3">
        {!forceError && !forceLoading && data?.polygon ? (
          <div className="min-h-0 flex-1 overflow-hidden">
            <RegionBoundary
              polygon={data.polygon}
              queryPoint={{ lat: data.latitude, lng: data.longitude }}
              districtName={data.district || undefined}
              locationIcon={<TbMapPin className="h-full w-full text-red-500" />}
              regionLabel={[data.province, data.city || '—', data.district || '—'].join(' · ')}
              coordsLabel={`${data.latitude.toFixed(5)}, ${data.longitude.toFixed(5)}`}
              width={400}
              height={MAP_HEIGHT}
              aria-label="Region boundary with query point"
            />
          </div>
        ) : (
          <div
            className="flex min-h-0 flex-1 flex-col items-center justify-center gap-2 text-center text-[11px] text-gray-500"
            data-testid={barError ? 'geocode-error' : error ? 'geocode-api-error' : undefined}
          >
            {barError ? (
              <>
                <span>This area is not supported for this service.</span>
                <button type="button" onClick={requestLocation} disabled={showLoading} className="text-gray-700 underline hover:no-underline disabled:opacity-50">
                  Retry
                </button>
              </>
            ) : !forceError && error ? (
              error.includes('not supported for this service') ? (
                <span className="text-amber-800">{error}</span>
              ) : (
                <span className="text-amber-800">
                  <span className="font-medium">Error: </span>
                  {error}
                </span>
              )
            ) : showLoading ? (
              <div className="flex min-h-[72px] flex-col items-center justify-center gap-1 text-center">
                <p className="flex items-center justify-center gap-0.5 text-[13px] font-medium text-gray-600">
                  <span>Getting location</span>
                  <AnimatedEllipsis />
                </p>
                <p className="text-[11px] text-gray-400">Allow location access to show the map</p>
              </div>
            ) : (
              <span>Map will appear after location is available</span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
