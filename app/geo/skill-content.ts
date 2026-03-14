/**
 * API skill document for agents: how to call China GEO HTTP API.
 * Use BASE_URL as placeholder; replaced with current origin when copying/downloading.
 * Prefer GET for cacheability (browser and Vercel cache by URL; long-lived).
 */
export const GEO_API_SKILL = `# China GEO API – HTTP usage for agents

Base URL: BASE_URL

## GET /api/geo – Reverse geocode (lat/lng to address) [preferred, cacheable]

Query: latitude (number), longitude (number). China only (Supabase china_geo).
Same params ⇒ same URL ⇒ browser and CDN cache (long-lived). Use from client via fetch only.

  GET BASE_URL/api/geo?latitude=39.9042&longitude=116.4074

Response (200): JSON (wrapped in standard envelope: code, message, data)
  data: { "province": "北京市", "city": "", "district": "", "latitude": 39.9042, "longitude": 116.4074 }

Errors: 400 invalid lat/lng; 404 this area is not supported for this service.

cURL:
  curl "BASE_URL/api/geo?latitude=39.9042&longitude=116.4074"

## POST /api/geo – Same semantics (body: latitude, longitude). Prefer GET for cache.
`
