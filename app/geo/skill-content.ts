/**
 * API skill document for agents: how to call Geolocation HTTP API.
 * Use BASE_URL as placeholder; replaced with current origin when copying/downloading.
 */
export const GEO_API_SKILL = `# Geolocation API – HTTP usage for agents

Base URL: BASE_URL

## POST /api/geo – Reverse geocode (lat/lng to address)

Body (JSON): latitude (number), longitude (number). Mainland China only.

  POST BASE_URL/api/geo
  Content-Type: application/json
  { "latitude": 39.9042, "longitude": 116.4074 }

Response (200): JSON
  {
    "country": "中国",
    "province": "北京市",
    "city": "",
    "district": "",
    "latitude": 39.9042,
    "longitude": 116.4074
  }

Errors: 400 invalid lat/lng; 404 location not found or not in mainland China.

cURL:
  curl -X POST "BASE_URL/api/geo" \\
    -H "Content-Type: application/json" \\
    -d '{"latitude":39.9042,"longitude":116.4074}'
`
