import * as turf from '@turf/turf'

import chinaGeoJsonData from '@/public/geo/china.json'

/**
 * Geographical location information interface
 */
export interface GeoLocation {
  country: string
  province: string
  city: string
  district: string
  latitude: number
  longitude: number
}

/**
 * GeoJSON Feature type
 */
interface GeoFeature {
  type: 'Feature'
  properties: {
    name: string
    level: 'province' | 'city' | 'district'
    parent?: string
    [key: string]: any
  }
  geometry: {
    type: 'Polygon' | 'MultiPolygon'
    coordinates: number[][][] | number[][][][]
  }
}

/**
 * GeoJSON data structure
 */
interface GeoJSONData {
  type: 'FeatureCollection'
  features: GeoFeature[]
}

let chinaGeoData: GeoJSONData | null = null

/**
 * Load China GeoJSON data
 * @returns Promise that resolves to GeoJSON data
 */
async function loadChinaGeoData(): Promise<GeoJSONData> {
  if (chinaGeoData) {
    return chinaGeoData as GeoJSONData
  }

  try {
    // Directly use imported GeoJSON data
    chinaGeoData = chinaGeoJsonData as unknown as GeoJSONData
    return chinaGeoData as GeoJSONData
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to load China GeoJSON data:', error)
    throw new Error('Failed to load geographic data')
  }
}

/**
 * Get geographical location information by latitude and longitude
 * @param latitude Latitude coordinate
 * @param longitude Longitude coordinate
 * @returns Geographical location information or null if not found
 */
export async function reverseGeocode(latitude: number, longitude: number): Promise<GeoLocation | null> {
  try {
    const geoData = await loadChinaGeoData()
    const pointToCheck = turf.point([longitude, latitude])

    // Find the area containing the point
    let province: string | null = null

    // First find the province
    for (const feature of geoData.features) {
      if (feature.properties.level === 'province' && turf.booleanPointInPolygon(pointToCheck, feature as any)) {
        province = feature.properties.name
        break
      }
    }

    // If no province is found, it means it is not within mainland China
    if (!province) {
      return null
    }

    return {
      country: '中国',
      province,
      city: '',
      district: '',
      latitude,
      longitude,
    }
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Reverse geocoding failed:', error)
    return null
  }
}

/**
 * Get geographical location information by IP address (fallback method)
 * @param ip IP address, optional
 * @returns Geographical location information or null if not found
 */
export async function getLocationByIP(ip?: string): Promise<GeoLocation | null> {
  try {
    // Use free IP geolocation service
    const url = ip ? `https://ipapi.co/${ip}/json/` : 'https://ipapi.co/json/'
    const response = await fetch(url)
    const data = await response.json()

    if (data.country && data.country === 'CN') {
      return {
        country: '中国',
        province: data.region,
        city: data.city,
        district: '',
        latitude: data.latitude,
        longitude: data.longitude,
      }
    }

    return null
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('IP geolocation failed:', error)
    return null
  }
}
