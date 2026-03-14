/**
 * China GEO service types. Province/city/district only (no country).
 */

/**
 * Location info from China GEO.
 * Hierarchy: province (省) -> city (市) -> district (区/县). Town (镇/街道) optional when available.
 * Real range is polygon only; use for point-in-polygon and drawing.
 */
export interface GeoLocation {
  province: string
  city: string
  district: string
  /** Town or subdistrict when available from data source (not provided by Supabase china_geo) */
  town?: string
  latitude: number
  longitude: number
  /** Region ids from RPC; used as stable cache key (one entry per region). */
  province_id?: number
  city_id?: number
  district_id?: number
  /** Real admin boundary polygon from DB; format "lng lat,lng lat,...". Only range field; use for containment and drawing. */
  polygon?: string
}

/** Result row from Supabase RPC geo_containing_point_deepest(lng, lat). */
export interface GeoContainingPointRow {
  province_id: number | null
  province_name: string | null
  city_id: number | null
  city_name: string | null
  district_id: number | null
  district_name: string | null
  ext_path: string | null
  /** Real boundary polygon from DB; format "lng lat,lng lat,...". */
  polygon?: string | null
}
