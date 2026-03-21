# Weather module (Spec)

Per-module spec for the Weather public API. Global convention: [api-semantics.md](../api-semantics.md) (anonymous read-only + latest credit/data; authenticated routes and policy exceptions per that spec).

---

## Scope: China only

- Weather is **mainland China only**, aligned with the project’s geography scope (china-geo).
- Locations outside China are not supported; requests will return an error (e.g. “Location not in mainland China”).
- **International / overseas weather is out of scope for now.** Other providers or services may be used later for non-China regions; no implementation is planned in the current module.

---

## Purpose

- Provide **latest** point-based weather conditions (current / “now”) for a specific location.
- Provide **latest** short-term weather forecast for a specific location (hours or days ahead), read-only and not historical.
- Focus on **practical, life-oriented** queries: “my current location”, “destination”, and “key waypoints” rather than bulk or nationwide data.

---

## Endpoints

Initial scope focuses on single-point queries. Multi-point / route use cases are treated as future extensions.

| Method | Path                    | Description                                             |
| ------ | ----------------------- | ------------------------------------------------------- |
| POST   | `/api/weather`          | Current (“now”) weather for a specific point (lat/lon). |
| POST   | `/api/weather/forecast` | Short-term forecast for a specific point (lat/lon).     |

---

## Overview behavior (example use case)

The **Overview page** for this module should not be a static description; it should demonstrate the Weather API’s capabilities with a small, life-oriented example:

- **Goal:** Help a user quickly answer “what is the weather where I am and where I am going?” without reading the API docs first.
- **Recommended behavior for `WeatherOverview`:**
  - Show a simple **point selector**:
    - A pair of inputs for `latitude` and `longitude` (pre-filled with an example, e.g. a city district).
    - A “Use current example point” button to reset to the default coordinates.
  - When the user clicks “Check weather”:
    - Call `POST /api/weather` to display the **now** card:
      - Location (city / district), temperature, condition text (e.g. "light rain"), and observed time.
    - Optionally call `POST /api/weather/forecast` (e.g. `granularity: "hourly", hours: 6`) to display a compact **next 6 hours** strip (list or chips with time + condition icon + temperature).
  - Layout:
    - Left/top: tiny form for the point (latitude/longitude + button).
    - Right/below: one or two cards showing “Now” and “Next hours” for that point, using the normalized response from this module’s public API (not raw provider payloads).
- **Constraint:** Overview must use the same public APIs defined above (`/api/weather`, `/api/weather/forecast`), not a separate, private endpoint. It is an example client of the Weather API, not a different service.

This makes the Weather overview consistent with other modules (each shows a concrete example of its API in action) while keeping the style and layout unified.

---

## Request / response

### POST `/api/weather`

- **Body:**
  - `latitude: number` — latitude in decimal degrees.
  - `longitude: number` — longitude in decimal degrees.
- **Response (200):**
  - Shape is intentionally minimal and life-oriented, for a single point:
    - `location`: object describing the resolved place (as returned by the provider):
      - `latitude: number`
      - `longitude: number`
      - `country?: string`
      - `province?: string`
      - `city?: string`
      - `district?: string`
      - `name?: string` (provider-specific location name, if available)
    - `now`: current weather at this point:
      - `observedAt: string` (ISO 8601 timestamp of observation)
      - `condition: string` (machine-friendly code, e.g. `rain`, `cloudy`)
      - `conditionText: string` (human-readable description, e.g. “Light rain”)
      - `temperature: number` (°C)
      - `feelsLike?: number` (°C, if available)
      - `humidity?: number` (percentage 0–100)
      - `windSpeed?: number` (m/s or km/h; unit documented in implementation)
      - `windDirection?: string` (e.g. `N`, `NE`)
      - `precipitation?: number` (mm, if available)
      - `precipitationProbability?: number` (0–1 or 0–100, documented in implementation)

### POST `/api/weather/forecast`

- **Body:**
  - `latitude: number`
  - `longitude: number`
  - `granularity?: "hourly" | "daily"` — forecast type; default may be `"hourly"` (implementation detail).
  - `hours?: number` — for hourly forecast, optional, bounded (e.g. `1–24`).
  - `days?: number` — for daily forecast, optional, bounded (e.g. `1–7`).
- **Response (200):**
  - `{ location, forecast }`, where:
    - `location`: same shape as in `/api/weather`.
    - `forecast`:
      - `granularity: "hourly" | "daily"`
      - `hours?: Array<ForecastHour>` when `granularity === "hourly"`
      - `days?: Array<ForecastDay>` when `granularity === "daily"`
  - Suggested shapes:
    - `ForecastHour`:
      - `time: string` (ISO 8601 timestamp)
      - `temperature: number`
      - `condition: string`
      - `conditionText: string`
      - `precipitation?: number`
      - `precipitationProbability?: number`
    - `ForecastDay`:
      - `date: string` (YYYY-MM-DD)
      - `minTemp: number`
      - `maxTemp: number`
      - `dayCondition: string`
      - `dayConditionText: string`
      - `nightCondition?: string`
      - `nightConditionText?: string`
      - `precipitationProbability?: number`

---

## Errors and boundaries

- Invalid input:
  - `latitude` or `longitude` missing or not a number → 400 (e.g. `error: "Invalid latitude or longitude"`).
  - `granularity` not in `"hourly" | "daily"`, or incompatible `hours` / `days` → 400.
- Out of coverage:
  - The service only supports **points within mainland China**. Location checks reuse the Geo module:
    - If the point is not within mainland China (per `reverseGeocode`), return 404 with a clear message (e.g. `error: "Location not in mainland China"`).
    - If the upstream provider cannot serve the requested point, return 404 with a clear message (e.g. `error: "Location not covered by weather provider"`).
- Upstream failure:
  - If the upstream weather provider fails (network, 5xx, invalid payload) and there is no usable cached data, return a 502 or 500 with an error payload; document the actual choice in implementation notes.

---

## Semantics (latest only)

- Both endpoints return **latest** available data:
  - `/api/weather` returns the provider’s most recent observation for the requested point.
  - `/api/weather/forecast` returns the provider’s most recent forecast snapshot for the requested point (e.g. next 24 hours or 7 days), not historical forecasts.
- No “as-of date” or history parameters are supported:
  - Any future “historical weather” or “forecast as published on date X” capability must use a **different path** (e.g. `/api/weather/history`) and a separate spec.
- The API is strictly **read-only** and does not mutate any state.

---

## Provider and caching notes

This module uses **QWeather** for both current (“now”) weather and short-term hourly forecast (`QWEATHER_API_KEY`). The public API shape is provider-agnostic; responses normalize QWeather field names.

- **Caching:**
  - Implement in-memory caching with TTL per point and granularity:
    - `now` responses may be cached for a short duration (e.g. 5–10 minutes).
    - `forecast` responses may be cached for a longer duration (e.g. 30–60 minutes).
  - HTTP responses should include appropriate `Cache-Control` headers (e.g. `s-maxage`, `stale-while-revalidate`), consistent with existing modules like Exchange Rate and Fuel Price.
  - Cache keys should be based on normalized coordinates (e.g. rounding latitude/longitude) to avoid unnecessary upstream calls for nearly identical locations.

---

## Future extensions

- **Multi-point / route weather:**
  - A future endpoint may accept multiple waypoints for a route:
    - `waypoints: Array<{ latitude: number, longitude: number, label?: string }>`
  - Response would return `now` / `forecast` per point, enabling “current location + destination + key stops” use cases.
  - This should be a **separate** path (e.g. `/api/weather/route`) with its own spec when needed.
