/**
 * China-geo browser-only surface. For use in hooks and client components only.
 * Do not import from API routes or server code — uses IndexedDB (window).
 *
 * For server/HTTP: use @/services/china-geo (reverseGeocode, etc.) or GET /api/geo.
 */

export { getGeoForPoint } from './get-geo'
export { deleteExpiredGeoRegions, type GeoLocationStored, getGeoFromIdb, setGeoInIdb } from './idb-cache'
