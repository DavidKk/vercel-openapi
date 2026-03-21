# China GEO module (Spec)

Per-module spec for the China GEO public API. Global convention: [api-semantics.md](../api-semantics.md) (anonymous read-only + latest credit/data; authenticated routes and policy exceptions per that spec).

---

## Purpose

- **Reverse geocode** a point (latitude, longitude) to province/city/district using Supabase `china_geo` (RPC `geo_containing_point_deepest`).
- **Scope:** China only. Other regions are not supported; points outside China return 404.

---

## Endpoints

| Method | Path       | Description                                                             |
| ------ | ---------- | ----------------------------------------------------------------------- |
| POST   | `/api/geo` | Body `{ latitude, longitude }` (numbers). Returns location info or 404. |

---

## Request / response

### POST `/api/geo`

- **Body:** `{ latitude: number, longitude: number }`.
- **Response (200):** e.g. `{ country, province, city, district, latitude, longitude }`.  
  Example: `country: "China", province: "Beijing", city, district`; numbers echoed.
- **Response (404):** Location not found or not in China — body with clear message (e.g. `error: "Location not found or not in China"`).

---

## Errors and boundaries

- Invalid input: `latitude` or `longitude` not a number → 400 (e.g. `error: "Invalid latitude or longitude"`).
- Point outside China or not found → 404 with message.

---

## Semantics (latest only)

- Service uses **current** geocoding data/source; no "as of date" or historical snapshot.
- Read-only; no state change. Any future "batch" or "history" geocode must use a **separate path** and spec.

---

## Bbox

- Response includes `bbox` (real admin boundary from DB) for cache lookup. The RPC `geo_containing_point_deepest` returns `min_lng`, `min_lat`, `max_lng`, `max_lat` from the region’s geometry; no synthetic fallback.
