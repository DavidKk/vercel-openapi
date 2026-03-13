# Product overview (Spec)

Product-level scope and module list. For API behavior (read-only, latest data only), see `.ai/specs/api-semantics.md`.

---

## Product positioning

This project provides a **unified public API layer** for developers. All public APIs are focused on **querying the latest credit/data status** (e.g. current holiday status, latest fuel prices, latest exchange rates, current geolocation info). It does **not** provide historical archives, complex analytics, or write operations as part of the public API surface.

---

## Out of scope (unless explicitly specified later)

- **Historical queries** — e.g. “holidays in 2020”, “fuel price on date X”. Any such feature must be defined in a separate spec and use distinct paths (e.g. `/api/holiday/history`).
- **Write operations** — public APIs are read-only; no create/update/delete for business data.
- **Heavy reporting / exports** — no built-in batch export or complex aggregation; keep responses small and current.

---

## Modules (current)

| Module            | Purpose (one line)                                                                 |
| ----------------- | ---------------------------------------------------------------------------------- |
| **Holiday**       | Query whether a date is a holiday and today’s holiday name (latest official data). |
| **Fuel Price**    | Query current fuel prices and promotion info by province.                          |
| **Exchange Rate** | Query current spot exchange rates for major currencies.                            |
| **Geolocation**   | Reverse geocode lat/lng to administrative region (mainland China).                 |
| **Movies**        | Example module: query latest movie list, ratings, etc.                             |

New modules must align with “public API = query latest credit/data” and be documented in specs when behavior differs from the default.
