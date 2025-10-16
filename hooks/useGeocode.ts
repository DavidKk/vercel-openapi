import { useCallback, useState } from 'react'

import type { GeoLocation } from '@/app/actions/geo'

export interface GeocodeResult {
  data: GeoLocation | null
  loading: boolean
  error: string | null
}

export function useGeocode() {
  const [result, setResult] = useState<GeocodeResult>({
    data: null,
    loading: false,
    error: null,
  })

  const geocode = useCallback(async (latitude: number, longitude: number) => {
    setResult({ data: null, loading: true, error: null })

    try {
      const response = await fetch('/api/geo', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ latitude, longitude }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.data?.error || result.error || 'Geocoding failed')
      }

      setResult({ data: result.data, loading: false, error: null })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      setResult({ data: null, loading: false, error: message })
    }
  }, [])

  return { ...result, geocode }
}
