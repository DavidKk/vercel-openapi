---
name: weather
description: When a user asks for weather or short forecast at a latitude/longitude → return current conditions or forecast.
---

# China Weather API – Point “now” & short forecast (agent-ready)

## When to use

- User wants **current weather** or a **short forecast** at a **latitude/longitude** (China-focused provider behavior; **404** if uncovered).
- Coordinate formats like Geo skill: `23.031389,113.137222` (Nanhai center example), `lat:… lng:…`, etc.
- **Do not** call with **only** a city name and **no** coordinates unless another tool resolves coords first.
- **Do not overuse:** unrelated intent → do not call.

## Multi-turn / Missing parameters

- **Parse first** two decimals for `latitude` (**-90..90**) and `longitude` (**-180..180**).
- **Forecast:** optional `granularity` (`hourly` | `daily`, default `hourly`), `hours` (e.g. 1–24 for hourly). If user omits forecast horizon, use a small default (e.g. 6) or ask once.
- If coords missing after parse → ask for two numbers — **do not** guess.

## Parameters

- **Now:** `latitude`, `longitude` (numbers, required) in JSON body.
- **Forecast:** same plus `granularity` (optional), `hours` (optional), `days` (optional / reserved).

## Steps

0. **Conversation cache:** Same **endpoint + normalized body** already **200** in this conversation → **reuse** `data`.
1. **Parse and validate** coordinates (and forecast options).
2. **Call** `POST /api/weather` (now) or `POST /api/weather/forecast` (forecast) with JSON body.
3. **Check HTTP status** (200 / 400 / 404 / 5xx).
4. **Extract** `location`, `now` or `forecast` from JSON.
5. **Format** a short natural summary (condition, temp, optional hourly peek).

## Request

**Now:**
`POST /api/weather` — body `{ "latitude": number, "longitude": number }`

**Forecast:**
`POST /api/weather/forecast` — body e.g. `{ "latitude": 23.031389, "longitude": 113.137222, "granularity": "hourly", "hours": 6 }` (佛山市南海区中心附近，维基百科 23°01′53″N 113°08′14″E)

## Response

- **200** — `location` (province/city/district etc.), `now` or `forecast` structure as returned.
- **400** — invalid lat/lng or bad granularity/hours.
- **404** — location not covered by provider → **do not retry** with same coords.
- **5xx** — upstream failure → retry later.

## Say to the user (one line)

- Lead with condition + temperature + location name if present.

## Output language

- **User’s language** for narration; keep `conditionText` and place strings from API as returned when showing raw labels.

## Idempotency & cache (conversation)

- Reuse identical POST body results in the same conversation.

## Examples

- User: “Weather at 23.031389, 113.137222 now” → POST `/api/weather` with that body → summarize `now`.
- User: “Next 6 hours same point” → POST `/api/weather/forecast` with `hours: 6`.
- User: “北京天气？” (no coordinates) → **Do not call** until coords known or user accepts using another geocode step.

## Agent rules

**POST** only for these routes; follow **Steps**.

## Error handling (HTTP)

- **400:** Fix body; **do not** retry blindly.
- **404:** Explain coverage gap; **no retry** same point.
- **5xx:** Retry later / suggest later.
