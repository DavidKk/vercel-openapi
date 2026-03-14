import { useCallback, useState } from 'react'

import type { GeoLocation } from '@/services/china-geo'
import { getGeoFromIdb, setGeoInIdb } from '@/services/china-geo/browser'

export interface GeocodeResult {
  data: GeoLocation | null
  loading: boolean
  error: string | null
}

/**
 * Priority: IndexedDB (local) → HTTP cache / server LRU → database.
 * Fetched results are stored in IndexedDB with 1-year TTL.
 */
export function useGeocode() {
  const [result, setResult] = useState<GeocodeResult>({
    data: null,
    loading: false,
    error: null,
  })

  const geocode = useCallback(async (latitude: number, longitude: number) => {
    setResult({ data: null, loading: true, error: null })

    try {
      const cached = await getGeoFromIdb(latitude, longitude)
      if (cached) {
        setResult({ data: cached as GeoLocation, loading: false, error: null })
        return
      }

      const url = `/api/geo?latitude=${encodeURIComponent(latitude)}&longitude=${encodeURIComponent(longitude)}`
      const response = await fetch(url, { method: 'GET', cache: 'default' })
      const json = await response.json()

      if (!response.ok) {
        throw new Error(json.data?.error || json.error || 'Geocoding failed')
      }

      const data = json.data as GeoLocation
      if (data.polygon) await setGeoInIdb(data)
      setResult({ data, loading: false, error: null })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      setResult({ data: null, loading: false, error: message })
    }
  }, [])

  return { ...result, geocode }
}
