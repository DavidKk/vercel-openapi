import { useEffect, useState } from 'react'

import { useGeocode } from '@/hooks/useGeocode'

export interface UserLocation {
  province: string | null
  loading: boolean
  error: string | null
}

/**
 * Hook to get user's location using browser geolocation API
 * and then geocode it to get province information
 */
export function useUserLocation(): UserLocation {
  const [province, setProvince] = useState<string | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const { data: geocodeData, loading: geocodeLoading, error: geocodeError, geocode } = useGeocode()

  useEffect(() => {
    // If we have geocoded data, set the province
    if (geocodeData) {
      setProvince(geocodeData.province)
      setLoading(false)
    }

    // If there's a geocoding error, set it
    if (geocodeError) {
      setError(geocodeError)
      setLoading(false)
    }
  }, [geocodeData, geocodeError])

  useEffect(() => {
    // Check if browser supports geolocation
    if (typeof window === 'undefined' || !navigator.geolocation) {
      setError('Geolocation is not supported by your browser')
      setLoading(false)
      return
    }

    // Only run in browser environment
    if (typeof window !== 'undefined') {
      // Get current position
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords
          // Use geocode function to get province information
          geocode(latitude, longitude)
        },
        (err) => {
          let errorMessage = ''
          switch (err.code) {
            case err.PERMISSION_DENIED:
              errorMessage = 'Location access denied by user'
              break
            case err.POSITION_UNAVAILABLE:
              errorMessage = 'Location information is unavailable'
              break
            case err.TIMEOUT:
              errorMessage = 'Location request timed out'
              break
            default:
              errorMessage = 'An unknown error occurred while getting location'
              break
          }
          setError(errorMessage)
          setLoading(false)
        },
        {
          timeout: 10000,
          enableHighAccuracy: true,
        }
      )
    }
  }, [geocode])

  return {
    province,
    loading: loading || geocodeLoading,
    error,
  }
}
