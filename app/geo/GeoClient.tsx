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
        // Automatically query location information
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
    <div className="max-w-4xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Geocoding Service</h1>
      <p className="mb-6">Get location information through latitude and longitude (China mainland only)</p>

      <form id="geocode-form" onSubmit={handleSubmit} className="mb-8 p-4 bg-gray-50 rounded-lg">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label htmlFor="latitude" className="block text-sm font-medium text-gray-700 mb-1">
              Latitude
            </label>
            <input
              type="number"
              id="latitude"
              value={latitude}
              onChange={(e) => setLatitude(e.target.value)}
              step="any"
              placeholder="e.g., 39.9042"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          <div>
            <label htmlFor="longitude" className="block text-sm font-medium text-gray-700 mb-1">
              Longitude
            </label>
            <input
              type="number"
              id="longitude"
              value={longitude}
              onChange={(e) => setLongitude(e.target.value)}
              step="any"
              placeholder="e.g., 116.4074"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <button
            type="button"
            onClick={getCurrentLocation}
            disabled={loading}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50"
          >
            {loading ? 'Getting Location...' : 'Get Current Location'}
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
          >
            {loading ? 'Querying...' : 'Query Location'}
          </button>
          {getLocationError && <span className="text-red-500 text-sm">{getLocationError}</span>}
        </div>
      </form>

      {error && (
        <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-lg">
          <h2 className="font-bold text-lg mb-2">Error</h2>
          <p>{error}</p>
        </div>
      )}

      {data && (
        <div className="p-4 bg-green-50 rounded-lg">
          <h2 className="font-bold text-lg mb-2">Location Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <div>
              <span className="font-medium">Country:</span> {data.country}
            </div>
            <div>
              <span className="font-medium">Province:</span> {data.province}
            </div>
            <div>
              <span className="font-medium">Latitude:</span> {data.latitude}
            </div>
            <div>
              <span className="font-medium">Longitude:</span> {data.longitude}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
