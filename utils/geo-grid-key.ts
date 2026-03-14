/**
 * Grid key from coordinates. Shared by client (IndexedDB cache key) and server (china-geo LRU).
 * Same precision so client and server use the same key for the same cell.
 */

/** Default precision: 3 decimal places ≈ ~111 m per cell. */
const DEFAULT_PRECISION = 3

/**
 * Build a cache key from coordinates by rounding to a grid cell.
 * Points in the same cell share one cache entry (range-based, not per-point).
 *
 * @param lat Latitude in decimal degrees
 * @param lng Longitude in decimal degrees
 * @param precision Decimal places for rounding (default 3)
 * @returns Cache key string for the grid cell
 */
export function getGridKey(lat: number, lng: number, precision: number = DEFAULT_PRECISION): string {
  const factor = 10 ** precision
  const roundedLat = Math.round(lat * factor) / factor
  const roundedLng = Math.round(lng * factor) / factor
  return `${roundedLat},${roundedLng}`
}
