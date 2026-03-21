# Holiday module (Spec)

Per-module spec for the Holiday public API. Global convention: [api-semantics.md](../api-semantics.md) (anonymous read-only + latest credit/data; authenticated routes and policy exceptions per that spec).

---

## Purpose

- Provide **latest** holiday/workday status and official holiday names for the current day or a given date.
- Provide the **latest** official holiday list for a given year (no historical archives; "latest" = current authoritative data for that year).

---

## Endpoints

| Method | Path                          | Description                                                         |
| ------ | ----------------------------- | ------------------------------------------------------------------- |
| GET    | `/api/holiday`                | Today's holiday status and name (latest data).                      |
| GET    | `/api/holiday/list?year=YYYY` | List holidays for year `YYYY` (latest official data for that year). |

---

## Request / response

### GET `/api/holiday`

- **Params:** none.
- **Response:** `{ "isHoliday": boolean, "name": string }`.  
  `name` = holiday name for today when applicable; empty string or non-holiday label when not a holiday.

### GET `/api/holiday/list`

- **Query:** `year` (optional) — number, e.g. `2025`. Default: current year.
- **Response:** Array of holiday entries (shape defined by implementation; typically date + name or similar).  
  Represents the **latest** official list for that year.

---

## Errors and boundaries

- Invalid or out-of-range `year`: normalize to a safe default (e.g. current year) and return that year's list; do not return 4xx for minor misuse if the codebase currently normalizes.
- If a spec later requires strict validation (e.g. 400 for year &lt; 2000), document it here.

---

## Semantics (latest only)

- Both endpoints return **latest** data only: no "as of date" or version parameter.
- Any future "historical" or versioned API (e.g. "holidays as published on date X") must be a **separate path** (e.g. `/api/holiday/history`) and described in a spec update.
