# Fuel Price module (Spec)

Per-module spec for the Fuel Price public API. Global convention: [api-semantics.md](../api-semantics.md) (anonymous read-only + latest credit/data; authenticated routes and policy exceptions per that spec).

---

## Purpose

- Provide **latest** fuel prices (b92, b95, b98, b0) for all provinces or a single province.
- Provide **latest** recharge promotion calculation for a province given fuel type, amount, and bonus (read-only; uses current price).

---

## Endpoints

| Method | Path                               | Description                                                                |
| ------ | ---------------------------------- | -------------------------------------------------------------------------- |
| GET    | `/api/fuel-price`                  | Current fuel prices for all provinces (latest data).                       |
| GET    | `/api/fuel-price/[province]`       | Current fuel prices for one province (path param, e.g. Beijing).           |
| GET    | `/api/fuel-price/[province]/promo` | Recharge promo result: fuelType, amount, bonus (query); uses latest price. |

---

## Request / response

### GET `/api/fuel-price`

- **Params:** none.
- **Response:** `{ current: Array<{ province, b92, b95, b98, b0 }>, previous?, latestUpdated, previousUpdated? }`.  
  Represents **latest** prices; cache headers (e.g. s-maxage=3600) apply.

### GET `/api/fuel-price/[province]`

- **Path:** `province` — province name (e.g. Beijing).
- **Response:** Same shape as above with one province in `current` / `previous`.

### GET `/api/fuel-price/[province]/promo`

- **Path:** `province`.
- **Query:** `fuelType` (b92|b95|b98|b0, default b92), `amount` (required, positive number), `bonus` (required, non-negative number).
- **Response:** Recharge promo result including province, fuelType, pricePerLiter, amount, latestUpdated, and calculated fields. Uses **latest** price for that province.

---

## Errors and boundaries

- **promo:** Invalid `fuelType` → 400. Missing or invalid `amount` / `bonus` → 400.
- **promo:** No fuel price data for province → 404.
- Unknown province on list/single endpoint: implementation may return empty or omit; document actual behavior if strict 404 is required later.

---

## Semantics (latest only)

- All endpoints return **latest** price data only; no "as of date" or history.
- Promo is a **calculation** from current price (read-only); it does not mutate any state.
- Any future "historical price" API must use a **separate path** (e.g. `/api/fuel-price/history`) and a separate spec.
