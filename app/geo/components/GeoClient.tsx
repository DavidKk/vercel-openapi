'use client'

import { useState } from 'react'

import { useGeocode } from '@/hooks/useGeocode'

export interface GeoData {
  country: string
  province: string
  city: string
  district: string
  latitude: number
  longitude: number
}

interface GeoClientProps {
  initialLatitude?: string
  initialLongitude?: string
}

export default function GeoClient({ initialLatitude = '', initialLongitude = '' }: GeoClientProps) {
  const [latitude, setLatitude] = useState(initialLatitude)
  const [longitude, setLongitude] = useState(initialLongitude)
  const [getLocationError, setGetLocationError] = useState('')
  const { data, loading, error, geocode } = useGeocode()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const lat = parseFloat(latitude)
    const lng = parseFloat(longitude)
    if (!isNaN(lat) && !isNaN(lng)) {
      geocode(lat, lng)
    }
  }

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      setGetLocationError('Geolocation is not supported by your browser')
      return
    }

    setGetLocationError('')

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords
        setLatitude(latitude.toString())
        setLongitude(longitude.toString())
        geocode(latitude, longitude)
      },
      (error) => {
        let errorMessage = ''
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'Location access denied by user'
            break
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Location information is unavailable'
            break
          case error.TIMEOUT:
            errorMessage = 'Location request timed out'
            break
          default:
            errorMessage = 'An unknown error occurred while getting location'
            break
        }
        setGetLocationError(errorMessage)
      },
      {
        timeout: 10000,
        enableHighAccuracy: true,
      }
    )
  }

  return (
    <div className="flex h-full w-full flex-col bg-white">
      <form id="geocode-form" onSubmit={handleSubmit} className="flex shrink-0 flex-wrap items-end gap-2 border-b border-gray-200 bg-white px-3 py-2">
        <label htmlFor="latitude" className="flex flex-col gap-0.5">
          <span className="text-[10px] text-gray-500">Latitude</span>
          <input
            type="number"
            id="latitude"
            value={latitude}
            onChange={(e) => setLatitude(e.target.value)}
            step="any"
            placeholder="39.9042"
            className="h-7 min-w-[14rem] rounded border border-gray-300 bg-white px-2 font-mono text-[11px] text-gray-900"
            required
          />
        </label>
        <label htmlFor="longitude" className="flex flex-col gap-0.5">
          <span className="text-[10px] text-gray-500">Longitude</span>
          <input
            type="number"
            id="longitude"
            value={longitude}
            onChange={(e) => setLongitude(e.target.value)}
            step="any"
            placeholder="116.4074"
            className="h-7 min-w-[14rem] rounded border border-gray-300 bg-white px-2 font-mono text-[11px] text-gray-900"
            required
          />
        </label>
        <button
          type="button"
          onClick={getCurrentLocation}
          disabled={loading}
          className="inline-flex h-7 items-center justify-center rounded border border-gray-300 bg-gray-900 px-2 py-1 text-[11px] font-medium text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? 'Getting…' : 'Get current location'}
        </button>
        <button
          type="submit"
          disabled={loading}
          className="inline-flex h-7 items-center justify-center rounded border border-gray-300 bg-gray-900 px-2 py-1 text-[11px] font-medium text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? 'Querying…' : 'Query location'}
        </button>
        {getLocationError && <span className="text-[11px] text-red-500">{getLocationError}</span>}
      </form>

      <div className="min-h-0 flex-1 overflow-auto px-3 py-3">
        {error && (
          <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-[11px] text-red-700" data-testid="geocode-error">
            <span className="font-medium">Error: </span>
            <span>{error}</span>
          </div>
        )}

        {data && (
          <div className="rounded-md border border-gray-200 bg-gray-50 px-3 py-3 text-[11px]">
            <div className="mb-2 font-medium text-gray-900">Location</div>
            <dl className="grid grid-cols-1 gap-x-4 gap-y-1.5 sm:grid-cols-2">
              <div className="flex gap-2">
                <dt className="shrink-0 text-gray-500">Country</dt>
                <dd className="font-mono text-gray-900">{data.country}</dd>
              </div>
              <div className="flex gap-2">
                <dt className="shrink-0 text-gray-500">Province</dt>
                <dd className="font-mono text-gray-900">{data.province}</dd>
              </div>
              <div className="flex gap-2">
                <dt className="shrink-0 text-gray-500">Latitude</dt>
                <dd className="font-mono text-gray-900">{data.latitude}</dd>
              </div>
              <div className="flex gap-2">
                <dt className="shrink-0 text-gray-500">Longitude</dt>
                <dd className="font-mono text-gray-900">{data.longitude}</dd>
              </div>
            </dl>
          </div>
        )}
      </div>
    </div>
  )
}
