/**
 * Shared parser for china_geo polygon text (AreaCity-style).
 * Aligns with sql/backfill-china-geo-geom.sql: only the first semicolon-separated segment
 * is treated as the exterior ring for containment and drawing; further segments (holes / parts) are ignored.
 */

/**
 * Parse the first exterior ring from china_geo polygon text into [lng, lat] vertices.
 * When the string contains `;`, only the segment before the first `;` is used.
 * @param polygon Raw polygon string from API or DB ("lng lat,lng lat,..." per ring)
 * @returns Closed-path vertices for the first ring, or empty array if none valid
 */
export function parsePolygonRing(polygon: string): [number, number][] {
  if (!polygon || typeof polygon !== 'string') return []
  const trimmed = polygon.trim()
  if (!trimmed) return []
  const ringText = trimmed.includes(';') ? trimmed.split(';')[0].trim() : trimmed
  if (!ringText) return []
  return ringText
    .split(',')
    .map((p) => p.trim().split(/\s+/).filter(Boolean))
    .filter((parts) => parts.length >= 2)
    .map((parts) => {
      const lng = Number(parts[0])
      const lat = Number(parts[1])
      return [lng, lat] as [number, number]
    })
    .filter(([lng, lat]) => Number.isFinite(lng) && Number.isFinite(lat))
}
