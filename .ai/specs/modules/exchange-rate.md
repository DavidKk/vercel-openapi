# Exchange Rate module (Spec)

Per-module spec for the Exchange Rate public API. Global convention: [api-semantics.md](../api-semantics.md) (anonymous read-only + latest credit/data; authenticated routes and policy exceptions per that spec).

---

## Purpose

- Provide **latest** spot exchange rates for a base currency (default USD).
- Provide **latest** currency conversion (from/to/amount → result); read-only, no state change.

---

## Endpoints

| Method | Path                 | Description                                                    |
| ------ | -------------------- | -------------------------------------------------------------- |
| GET    | `/api/exchange-rate` | Current rates for a base currency (query `base`, default USD). |
| POST   | `/api/exchange-rate` | Convert amount: body `{ from, to, amount }` → result.          |

---

## Request / response

### GET `/api/exchange-rate`

- **Query:** `base` (optional) — base currency code, default `USD`.
- **Response:** `{ base: string, date?: string, rates: Record<string, number> }`.  
  Represents **latest** rates; cache headers (e.g. s-maxage=300) apply.

### POST `/api/exchange-rate`

- **Body:** `{ from: string, to: string, amount: number }` (currency codes and amount).
- **Response:** `{ from, to, amount, result, rate?, date? }` or equivalent.  
  Conversion uses **latest** rate; no side effects.

---

## Errors and boundaries

- Invalid or missing `base` (GET) → 400.
- Invalid body (POST): missing or wrong types for `from` / `to` / `amount` → 400.
- Unsupported currency or upstream failure: document actual status and message (e.g. 502 or 200 with error field) per implementation.

---

## Semantics (latest only)

- GET returns **latest** rates only; no "as of date" or history parameter.
- POST is **read-only**: it computes from current rate and does not mutate any state.
- Any future "historical rates" or "rates as of date X" must use a **separate path** and spec.
