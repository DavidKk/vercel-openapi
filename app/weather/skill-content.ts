/**
 * API skill document for agents: how to call Weather HTTP API.
 * Use BASE_URL as placeholder; replaced with current origin when copying/downloading.
 */
export const WEATHER_API_SKILL = `# Weather API – HTTP usage for agents

Base URL: BASE_URL

## POST /api/weather – Current point-based weather ("now")

Get the latest weather conditions for a single point specified by latitude and longitude.

Body (JSON):
  {
    "latitude": 23.13,
    "longitude": 113.27
  }

Example:
  POST BASE_URL/api/weather
  Content-Type: application/json
  {
    "latitude": 23.13,
    "longitude": 113.27
  }

Response (200): JSON
  {
    "location": {
      "latitude": 23.13,
      "longitude": 113.27,
      "country": "中国",
      "province": "广东省",
      "city": "佛山市",
      "district": "南海区",
      "name": "佛山·南海区"
    },
    "now": {
      "observedAt": "2025-01-15T08:00:00Z",
      "condition": "rain",
      "conditionText": "小雨",
      "temperature": 18,
      "feelsLike": 17,
      "humidity": 92,
      "windSpeed": 3.2,
      "windDirection": "NE"
    }
  }

Notes:
- Latitude/longitude are decimal degrees.
- This endpoint always returns the latest available "now" observation; it does not support historical queries.

## POST /api/weather/forecast – Short-term forecast for a point

Get short-term forecast for the same point. The initial implementation focuses on hourly forecasts.

Body (JSON):
  {
    "latitude": 23.13,
    "longitude": 113.27,
    "granularity": "hourly",
    "hours": 6
  }

Fields:
- latitude (number): Latitude in decimal degrees.
- longitude (number): Longitude in decimal degrees.
- granularity (optional, string): "hourly" or "daily". Default "hourly".
- hours (optional, number): For hourly forecast, number of hours to return (e.g. 1–24).
- days (optional, number): Reserved for future daily implementation.

Example:
  POST BASE_URL/api/weather/forecast
  Content-Type: application/json
  {
    "latitude": 23.13,
    "longitude": 113.27,
    "granularity": "hourly",
    "hours": 6
  }

Response (200): JSON
  {
    "location": {
      "latitude": 23.13,
      "longitude": 113.27,
      "country": "中国",
      "province": "广东省",
      "city": "佛山市",
      "district": "南海区"
    },
    "forecast": {
      "granularity": "hourly",
      "hours": [
        {
          "time": "2025-01-15T09:00:00Z",
          "temperature": 18,
          "condition": "rain",
          "conditionText": "小雨"
        }
      ]
    }
  }

Errors:
- 400: Invalid latitude/longitude or invalid granularity/hours/days.
- 404: Location not covered by the weather provider.
- 5xx: Upstream provider errors or unexpected failures.

cURL examples:

  # Current weather for a point
  curl -X POST "BASE_URL/api/weather" \\
    -H "Content-Type: application/json" \\
    -d '{"latitude":23.13,"longitude":113.27}'

  # Hourly forecast for the next 6 hours
  curl -X POST "BASE_URL/api/weather/forecast" \\
    -H "Content-Type: application/json" \\
    -d '{"latitude":23.13,"longitude":113.27,"granularity":"hourly","hours":6}'
`
