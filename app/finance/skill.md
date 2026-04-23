---
name: finance
description: When a user asks for Saudi TASI company daily data or a market summary for dates/ranges → return OHLC/market results.
---

# Finance API – TASI company & market daily (agent-ready)

## When to use

- User asks for **Saudi TASI** **company daily** rows or **market summary** (today, a single date, or K-line range) as exposed by this service.
- Triggers: “TASI”, “company 1120”, “market summary”, “from-to K-line”, **YYYY-MM-DD** dates in query.
- **Do not** call for unrelated markets or generic stock advice without matching this API.
- **Do not overuse:** unrelated intent → do not call.

## Multi-turn / Missing parameters

- **Parse first:** `date`, `from`/`to`, `code` from natural language; dates must be **YYYY-MM-DD**.
- **Company K-line** requires **all three** query params: `code`, `from`, `to`. If any missing, ask once — **do not** guess.
- **Market K-line** requires **both** `from` and `to`. If the user wants a range but only one date is given, ask once for **from** and **to** — **do not** guess.

## Parameters

**Company daily** `GET /api/finance/tasi/company/daily` (pick **one** mode per call; handler checks **K-line first** if `code` + `from` + `to` are all present):

| Mode                  | Query                                             | Meaning                                                                           |
| --------------------- | ------------------------------------------------- | --------------------------------------------------------------------------------- |
| Latest snapshot       | _(none)_                                          | Today’s **all-company** list (same “latest trading day” semantics as server).     |
| Single historical day | `date=YYYY-MM-DD`                                 | All companies for that calendar day from store.                                   |
| Company K-line        | `code=<ticker>` `from=YYYY-MM-DD` `to=YYYY-MM-DD` | One company’s daily rows in range (server clamps to max range, see **Response**). |

**Market summary** `GET /api/finance/tasi/summary/daily`:

| Mode            | Query                             | Meaning                                                   |
| --------------- | --------------------------------- | --------------------------------------------------------- |
| Latest snapshot | _(none)_                          | One **market summary** row for “today” snapshot behavior. |
| Single day      | `date=YYYY-MM-DD`                 | Summary for that day (may be `null` in `data` if no row). |
| Index K-line    | `from=YYYY-MM-DD` `to=YYYY-MM-DD` | Array of daily summary rows (may be `[]`).                |

**Daily-data alignment check (REST only)** `GET /api/finance/tasi/summary/hourly`:

| Mode              | Query    | Meaning                                                                 |
| ----------------- | -------- | ----------------------------------------------------------------------- |
| Hourly validation | _(none)_ | Pull SAHMK summary, map to current daily summary fields, return compare |

## Steps

0. **Conversation cache:** Same full URL (path + query string) already returned **HTTP 200** with usable `data` in this conversation → **reuse**; skip HTTP.
1. **Map** user intent to **company** vs **summary** and to the correct **mode** row in **Parameters**.
2. **Validate** all required query parts for that mode (K-line triple / range pair / `date` format).
3. **Call** the appropriate **GET** (no request body).
4. **Check HTTP status first**, then read envelope `{ code, message, data }` on **200**.
5. **Format** a compact answer: row count, headline OHLC/volume fields, or one sample row — **never invent** numbers not present in `data`.

## Request

**Company daily**

```http
GET /api/finance/tasi/company/daily
GET /api/finance/tasi/company/daily?date=2026-03-01
GET /api/finance/tasi/company/daily?code=1120&from=2026-01-01&to=2026-03-01
```

**Market summary**

```http
GET /api/finance/tasi/summary/daily
GET /api/finance/tasi/summary/daily?date=2026-03-01
GET /api/finance/tasi/summary/daily?from=2026-01-01&to=2026-03-01
```

**Caching (server):** responses may include `Cache-Control` with short `s-maxage` — same URL may be cached at the edge; **step 0** still avoids duplicate calls inside one chat.

## Response

**Envelope (success path):** HTTP **200**, body **`{ code: 0, message: "ok", data: … }`**. Always interpret **`data`** for business content; **`code` in JSON is 0** on success.

**Important:** **`data` may be an empty array `[]` or `null`** on **200** — e.g. invalid date strings, bad range, or no stored row. That is **not** an HTTP client error; treat as “no rows” and explain to the user instead of retrying the same URL.

### Company daily — shape of `data`

- **Type:** **`TasiCompanyDailyRecord[]`** (array; length ≥ 0).
- **Stable fields to surface** (others may appear; use as returned):

| Field                     | Meaning                               |
| ------------------------- | ------------------------------------- |
| `code`                    | Ticker / company code (string).       |
| `name`                    | Company name.                         |
| `lastPrice`               | Last price (nullable).                |
| `change`, `changePercent` | Change vs previous close (nullable).  |
| `volume`, `turnover`      | Liquidity (nullable).                 |
| `open`, `high`, `low`     | OHLC-style session fields (nullable). |
| `date`                    | Row date if present (nullable).       |

### Market summary — shape of `data`

- **No `date` and no range:** **`TasiMarketSummary | null`** — single object or no row.
- **`date=` only:** **`TasiMarketSummary | null`**.
- **`from` + `to`:** **`TasiMarketSummary[]`** — one object per day in range (may be `[]`).

**Stable fields on each summary object:**

| Field                                                              | Meaning                        |
| ------------------------------------------------------------------ | ------------------------------ |
| `date`                                                             | Session date (nullable).       |
| `open`, `high`, `low`, `close`                                     | OHLC (nullable).               |
| `change`, `changePercent`                                          | Index move (nullable).         |
| `companiesTraded`, `volumeTraded`, `valueTraded`, `numberOfTrades` | Market stats (nullable).       |
| `marketCap`                                                        | Nullable.                      |
| `notes`                                                            | Optional free-text (nullable). |

**Range limits:** K-line queries are **clamped** to a **maximum span** (order of **one year** of calendar days). If the user asks for a longer range, the server shortens `to` — state that the returned range may be truncated if you surface dates.

## Say to the user (one line)

- State **date or range**, **row count** or **key OHLC/volume** from `data`, and that values come from **TASI** feed/store — if `data` is empty/null, say **no data for that query** instead of guessing.

## Output language

- **User’s language** for explanation; keep **numbers**, **ticker `code`**, and **proper names** exactly as in `data`.

## Idempotency & cache (conversation)

- Reuse identical **GET** results in the same conversation (**step 0**).
- Call again only if the user **changes** the question or you never got a **200** with a parsed body.

## Examples

- User: “TASI market summary today” → `GET /api/finance/tasi/summary/daily` → read `data` (object or `null`).
- User: “Company 1120 from 2026-01-01 to 2026-03-01” → `GET /api/finance/tasi/company/daily?code=1120&from=2026-01-01&to=2026-03-01` → summarize **array** length and sample row.
- User: “Fuel price in Beijing” → **Do not call this API**.

## Agent rules

**GET** only; follow **Steps**; match **Parameters** tables; if `data` is `[]` or `null` on **200**, **do not** retry the same URL expecting a different outcome unless the user fixes dates or codes.

## Error handling (HTTP)

| Status    | Agent behavior                                                                                                                  |
| --------- | ------------------------------------------------------------------------------------------------------------------------------- |
| **200**   | Success envelope; **`data` may still be empty** — see **Response**. **Do not** treat empty `data` as a transport error.         |
| **500**   | Server or upstream failure — **one** polite retry later is OK; if still failing, stop and quote `message` from JSON if present. |
| **Other** | Rare for these routes — report briefly; **do not** loop retries on **4xx**.                                                     |
