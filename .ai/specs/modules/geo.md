# Geolocation module (Spec)

Per-module spec for the Geolocation public API. Global convention: [api-semantics.md](../api-semantics.md) (read-only, latest credit/data).

---

## Purpose

- **Reverse geocode** a point (latitude, longitude) to administrative region info.
- **Scope:** Mainland China only. Points outside this region are out of scope and return an error.

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
  Example: `country: "中国", province: "北京市", city, district`; numbers echoed.
- **Response (404):** Location not found or **not in mainland China** — body with clear message (e.g. `error: "Location not found or not in mainland China"`).

---

## Errors and boundaries

- Invalid input: `latitude` or `longitude` not a number → 400 (e.g. `error: "Invalid latitude or longitude"`).
- Point outside mainland China or not found → 404 with message.

---

## Semantics (latest only)

- Service uses **current** geocoding data/source; no "as of date" or historical snapshot.
- Read-only; no state change. Any future "batch" or "history" geocode must use a **separate path** and spec.
