---
name: finance
description: Stocks (index snapshot + exchange index/company daily & hourly; TASI feed today), funds (six-digit OHLCV vs NAV daily), precious metals (XAUUSD via market/daily + Turso eastmoney-precious-spot) — pick the matching REST path.
---

# Finance API — Stocks / Funds / Precious metals (agent-ready)

## Taxonomy (same as sidebar)

| Major               | Meaning                                                                                                                                                                                        |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Stocks**          | Stock market: multi-market **index snapshot**, exchange-scoped **index daily**, **index hourly**, **constituent company daily** — today only **TASI** is implemented for `market=` feed paths. |
| **Funds**           | Six-digit **daily** data in **two shapes**: **exchange daily bars (OHLCV)** vs **NAV disclosure (unit + daily %)**.                                                                            |
| **Precious metals** | Spot **XAUUSD** daily OHLCV via same route as ETF kline (`GET /api/finance/market/daily?symbols=XAUUSD`); Turso `source=eastmoney-precious-spot`. Only XAUUSD in scope today.                  |

## When to use

- **Stocks — index snapshot (all overview markets)** (TASI, S&P 500, Dow Jones, Nasdaq, …): `GET /api/finance/stock/summary?market=...` or batch `markets=...`.
- **Stocks — index daily (exchange feed; TASI only today)** — index K-line / summary from feed + Turso: `GET /api/finance/market/summary/daily` with **`market=TASI`** (default). Legacy `/api/finance/tasi/summary/daily` works.
- **Stocks — index hourly (exchange feed; TASI only today)**: `GET /api/finance/market/summary/hourly?market=TASI`. Legacy `GET /api/finance/tasi/summary/hourly` is the same handler.
- **Stocks — constituents daily (exchange feed; TASI only today)** — company list / K-line: `GET /api/finance/market/company/daily` with **`market=TASI`** (default). Legacy `/api/finance/tasi/company/daily` works.
- **Funds / precious spot — exchange-style daily OHLCV** (Turso range; six-digit symbols **or** `XAUUSD`; rejects NAV-only codes; optional `withIndicators` / `syncIfEmpty`): `GET /api/finance/market/daily?symbols=...&startDate=...&endDate=...`.
- **Funds — NAV disclosure daily series** (unit + daily %; LSJZ-backed codes only; optional `syncIfEmpty`): `GET /api/finance/fund/nav/daily?symbols=...&startDate=...&endDate=...`.
- **Funds — overview `stockList` + MACD** (latest bar per symbol, not full daily rows): `GET /api/finance/overview/stock-list?symbols=...&startDate=...&endDate=...` (optional `syncIfEmpty`).
- **Do not** use exchange `market=` feed paths for non-TASI markets — they return **400**; use **`/api/finance/stock/summary`** for other overview indices.

## Multi-turn / Missing parameters

- **Parse first:** `market`, `date`, `from`/`to`, `code` from natural language; dates **YYYY-MM-DD**.
- **Company K-line (TASI):** requires **`code`**, **`from`**, **`to`** (plus `market=TASI` if omitted). If any missing, ask once — do not guess.
- **Index K-line (TASI):** requires **`from`** and **`to`**. If only one date, ask for the range.

## Parameters (canonical REST)

### Stocks — index snapshot (all overview markets)

`GET /api/finance/stock/summary`

| Mode   | Query                                                                                          |
| ------ | ---------------------------------------------------------------------------------------------- |
| Single | `market=TASI` (default) or `market=S%26P%20500`, `Dow%20Jones`, `Nasdaq`, …                    |
| Batch  | `markets=TASI,S%26P%20500,Dow%20Jones` (comma-separated; same per-market cold-start as single) |

**HTTP 200 body:** `{ "code": 0, "message": "ok", "data": … }` — single: `data: { "market", "summary" }`; batch: `data: { "items": [...] }`.

### Stocks — constituents daily (TASI feed / Turso)

`GET /api/finance/market/company/daily` — **`market=TASI`** (default). K-line checked first if `code` + `from` + `to` present.

| Mode                  | Query                               |
| --------------------- | ----------------------------------- |
| Latest snapshot       | `market=TASI` or omit `market`      |
| Single historical day | `date=YYYY-MM-DD`                   |
| Company K-line        | `code=<ticker>` `from=...` `to=...` |

### Stocks — index daily (TASI index feed / Turso)

`GET /api/finance/market/summary/daily` — **`market=TASI`** (default).

| Mode         | Query                             |
| ------------ | --------------------------------- |
| Latest       | _(none)_ or `market=TASI`         |
| Single day   | `date=YYYY-MM-DD`                 |
| Index K-line | `from=YYYY-MM-DD` `to=YYYY-MM-DD` |

### Stocks — index hourly alignment

`GET /api/finance/market/summary/hourly` — optional `market=TASI` (default). **TASI only** today; no other query params.

## Steps

0. **Conversation cache:** Same full URL already returned **HTTP 200** with usable `data` → reuse.
1. **Choose path:** stocks snapshot → **stock/summary**; stocks exchange feed (TASI today) → **market/company/daily** or **market/summary/daily** / **hourly** with `market=TASI`; funds → **market/daily** vs **fund/nav/daily** vs **overview/stock-list**.
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
| `get_market_daily`          | Exchange OHLCV only: `symbols`, `startDate`, `endDate`; optional `withIndicators`; optional `syncIfEmpty` (default **true**). Fund NAV codes → `get_fund_nav_daily`.                      |
| `get_fund_nav_daily`        | Fund NAV only: same `symbols` / dates; optional `syncIfEmpty` (default **true** for allowlisted NAV catalog). Returns `{ items, synced }` with `unitNav` + `dailyChangePercent`.          |
| `get_overview_stock_list`   | Same date range + `symbols`; optional `syncIfEmpty`. Returns `{ stockList, synced }` — **one row per symbol** (latest bar + MACD streak), not the full daily series (`get_market_daily`). |

## Response

Same envelope: **`{ code: 0, message: "ok", data: … }`**. **`data`** may be `[]` or `null` on **200** — treat as no rows, not a transport error.

- **`/api/finance/stock/summary`:** `data` is `{ market, summary }` (single) or `{ items }` (batch), not a bare `ok` flag.
- **`/api/finance/market/daily`:** `data` is `{ items, synced }` with **exchange OHLCV** rows only (`items[].open` … `turnoverRate`, optional `macdUp`/`macdDown`).
- **`/api/finance/fund/nav/daily`:** `data` is `{ items, synced }` with **fund NAV** rows (`items[].unitNav`, `items[].dailyChangePercent` only).

## Examples

- User: “Nasdaq summary today” → `GET /api/finance/stock/summary?market=Nasdaq`.
- User: “TASI market summary today” → `GET /api/finance/market/summary/daily` or `?market=TASI`.
- User: “Company 1120 from 2026-01-01 to 2026-03-01” on TASI → `GET /api/finance/market/company/daily?market=TASI&code=1120&from=2026-01-01&to=2026-03-01`.

## Agent rules

**GET** only; if TASI feed path returns **400**, read `message` and prefer **`/api/finance/stock/summary`** for non-TASI index snapshots.
