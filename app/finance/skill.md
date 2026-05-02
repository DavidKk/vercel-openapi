---
name: finance
description: When a user asks for Saudi TASI company/index daily (feed/Turso) or a stock-market summary (any overview market) → use the correct REST path and optional market param.
---

# Finance API — stock markets + TASI feed (agent-ready)

## When to use

- **Any overview market latest snapshot** (TASI, S&P 500, Dow Jones, Nasdaq, …): `GET /api/finance/stock/summary?market=...` or batch `markets=...`.
- **Saudi TASI only** — full **company daily** list, **index** history / K-line from feed + Turso: canonical `GET /api/finance/market/company/daily` and `GET /api/finance/market/summary/daily` with **`market=TASI`** (default). Legacy `/api/finance/tasi/...` URLs still work for existing integrations.
- **Hourly alignment (REST)**: `GET /api/finance/market/summary/hourly?market=TASI` (generic `market`; **TASI only** today). Legacy `GET /api/finance/tasi/summary/hourly` is the same handler.
- **Six-digit full OHLCV table** (Turso date range, optional `withIndicators` / `syncIfEmpty`): `GET /api/finance/market/daily?symbols=...&startDate=...&endDate=...`.
- **Overview `stockList` + MACD on latest bar only** (aggregated one row per symbol, not the full daily series): `GET /api/finance/overview/stock-list?symbols=...&startDate=...&endDate=...` (optional `syncIfEmpty`).
- **Do not** use TASI feed paths for non-TASI company lists — they return **400**; use **stock summary** instead for other indices.

## Multi-turn / Missing parameters

- **Parse first:** `market`, `date`, `from`/`to`, `code` from natural language; dates **YYYY-MM-DD**.
- **Company K-line (TASI):** requires **`code`**, **`from`**, **`to`** (plus `market=TASI` if omitted). If any missing, ask once — do not guess.
- **Index K-line (TASI):** requires **`from`** and **`to`**. If only one date, ask for the range.

## Parameters (canonical REST)

### Stock summary (all overview markets)

`GET /api/finance/stock/summary`

| Mode   | Query                                                                                          |
| ------ | ---------------------------------------------------------------------------------------------- |
| Single | `market=TASI` (default) or `market=S%26P%20500`, `Dow%20Jones`, `Nasdaq`, …                    |
| Batch  | `markets=TASI,S%26P%20500,Dow%20Jones` (comma-separated; same per-market cold-start as single) |

**HTTP 200 body:** `{ "code": 0, "message": "ok", "data": … }` — single: `data: { "market", "summary" }`; batch: `data: { "items": [...] }`.

### Company daily (TASI feed / Turso)

`GET /api/finance/market/company/daily` — **`market=TASI`** (default). K-line checked first if `code` + `from` + `to` present.

| Mode                  | Query                               |
| --------------------- | ----------------------------------- |
| Latest snapshot       | `market=TASI` or omit `market`      |
| Single historical day | `date=YYYY-MM-DD`                   |
| Company K-line        | `code=<ticker>` `from=...` `to=...` |

### Market summary daily (TASI index feed / Turso)

`GET /api/finance/market/summary/daily` — **`market=TASI`** (default).

| Mode         | Query                             |
| ------------ | --------------------------------- |
| Latest       | _(none)_ or `market=TASI`         |
| Single day   | `date=YYYY-MM-DD`                 |
| Index K-line | `from=YYYY-MM-DD` `to=YYYY-MM-DD` |

### Hourly alignment

`GET /api/finance/market/summary/hourly` — optional `market=TASI` (default). **TASI only** today; no other query params.

## Steps

0. **Conversation cache:** Same full URL already returned **HTTP 200** with usable `data` → reuse.
1. **Choose path:** stock overview → **stock/summary**; Saudi companies / TASI index history → **market/company** or **market/summary** with `market=TASI`.
2. **Validate** required query parts for that mode.
3. **GET** only (no body).
4. **Check HTTP** then envelope `{ code, message, data }` on **200**.
5. **Summarize** from `data` — never invent numbers.

## Request examples

```http
GET /api/finance/stock/summary?market=Nasdaq
GET /api/finance/market/company/daily?market=TASI
GET /api/finance/market/company/daily?market=TASI&date=2026-03-01
GET /api/finance/market/company/daily?market=TASI&code=1120&from=2026-01-01&to=2026-03-01
GET /api/finance/market/summary/daily?market=TASI
GET /api/finance/market/summary/daily?market=TASI&date=2026-03-01
GET /api/finance/market/summary/daily?market=TASI&from=2026-01-01&to=2026-03-01
GET /api/finance/market/summary/hourly?market=TASI
```

Legacy (same handlers; add `market=TASI` on canonical paths when possible):

```http
GET /api/finance/tasi/company/daily
GET /api/finance/tasi/summary/daily
GET /api/finance/tasi/summary/hourly
```

## MCP / function calling (same `tool` names as POST `/api/mcp/finance`)

| Tool                        | Role                                                                                                                                                                                      |
| --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `get_stock_summary`         | Latest snapshot: `market` or `markets` (comma-separated).                                                                                                                                 |
| `get_market_company_daily`  | TASI company rows; optional `market` (default TASI); `date` or `code`+`from`+`to`.                                                                                                        |
| `get_market_summary_daily`  | TASI index daily / K-line; optional `market` (default TASI).                                                                                                                              |
| `get_market_summary_hourly` | TASI SAHMK alignment; optional `market` (default TASI).                                                                                                                                   |
| `get_market_daily`          | `symbols`, `startDate`, `endDate`; optional `withIndicators`; optional `syncIfEmpty` (default **true** for allowlisted fund/ETF symbols). Returns `synced` when ingest ran.               |
| `get_overview_stock_list`   | Same date range + `symbols`; optional `syncIfEmpty`. Returns `{ stockList, synced }` — **one row per symbol** (latest bar + MACD streak), not the full daily series (`get_market_daily`). |

## Response

Same envelope: **`{ code: 0, message: "ok", data: … }`**. **`data`** may be `[]` or `null` on **200** — treat as no rows, not a transport error.

- **`/api/finance/stock/summary`:** `data` is `{ market, summary }` (single) or `{ items }` (batch), not a bare `ok` flag.
- **`/api/finance/market/daily`:** `data` includes `{ items, synced }`; `synced: true` means an allowlisted on-demand ingest ran before the final read.

## Examples

- User: “Nasdaq summary today” → `GET /api/finance/stock/summary?market=Nasdaq`.
- User: “TASI market summary today” → `GET /api/finance/market/summary/daily` or `?market=TASI`.
- User: “Company 1120 from 2026-01-01 to 2026-03-01” on TASI → `GET /api/finance/market/company/daily?market=TASI&code=1120&from=2026-01-01&to=2026-03-01`.

## Agent rules

**GET** only; if TASI feed path returns **400**, read `message` and prefer **`/api/finance/stock/summary`** for non-TASI index snapshots.
