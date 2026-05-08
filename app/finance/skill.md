---
name: finance
description: Stocks (index snapshot + exchange index/company daily & hourly; TASI feed today), funds (six-digit OHLCV vs NAV daily), precious metals (XAUUSD via market/daily + Turso eastmoney-precious-spot) — pick the matching REST path.
---

# Finance API — Stocks / Funds / Precious metals (agent-ready)

## Taxonomy (same as sidebar)

| Major               | Meaning                                                                                                                                                                                               |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Stocks**          | Stock market: multi-market **index snapshot**, exchange-scoped **index daily**, **index hourly**, **constituent company daily** — today only **TASI** is implemented for `market=` feed paths.        |
| **Funds**           | Six-digit **daily** data in **two shapes**: **exchange daily bars (OHLCV)** vs **NAV disclosure (unit + daily %)**.                                                                                   |
| **Precious metals** | Spot **XAUUSD** daily OHLCV via **`GET /api/finance/fund/XAUUSD/ohlcv/daily`** (canonical; legacy `market/daily?symbols=XAUUSD`); Turso `source=eastmoney-precious-spot`. Only XAUUSD in scope today. |

## When to use

- **Stocks — index snapshot (all overview markets)** (TASI, S&P 500, Dow Jones, Nasdaq, …): `GET /api/finance/stock/summary?market=...` or batch `markets=...`.
- **Stocks — index daily (exchange feed; TASI only today)** — canonical: **`GET /api/finance/stock/tasi/summary/daily`** (slug matches `/finance/stock/tasi`; no `market=` query). Legacy: `GET /api/finance/market/summary/daily?market=TASI`.
- **Stocks — index hourly (exchange feed; TASI only today)**: **`GET /api/finance/stock/tasi/summary/hourly`**. Legacy: `GET /api/finance/market/summary/hourly?market=TASI`.
- **Stocks — constituents daily (exchange feed; TASI only today)** — **`GET /api/finance/stock/tasi/company/daily`**. Legacy: `GET /api/finance/market/company/daily?market=TASI`.
- **Stocks — one-call latest snapshot (TASI)** — **`GET /api/finance/stock/tasi/daily/latest`** returns `{ asOf, dataDate, summary, items }` (index + all companies).
- **Funds / precious spot — exchange-style daily OHLCV (canonical)** — **`GET /api/finance/fund/{symbol}/ohlcv/daily?startDate=...&endDate=...`** (`{symbol}` six-digit or `XAUUSD`; optional `withIndicators=true` adds MACD fields using legacy window cold-start by default; optional `indicatorWarmup=true` uses 120 calendar days; optional `indicatorWarmupDays=35..250` sets the lookback; optional `forceSync=true` refreshes allowlisted cached ranges). Multi-symbol batch legacy: `GET /api/finance/market/daily?symbols=...`.
- **Funds / precious — latest one OHLCV bar** — **`GET /api/finance/fund/{symbol}/ohlcv/daily/latest`** (same path shape as `market/daily/latest`). Legacy: `GET /api/finance/market/daily/latest?symbols=...`.
- **Funds — NAV disclosure daily series (canonical)** — **`GET /api/finance/fund/{symbol}/nav/daily?startDate=...&endDate=...`**. Legacy: `GET /api/finance/fund/nav/daily?symbols=...`.
- **Funds — latest one NAV row** — **`GET /api/finance/fund/{symbol}/nav/daily/latest`**. Legacy: `GET /api/finance/fund/nav/daily/latest?symbols=...`.
- **Stocks — TASI latest (split)** — **`GET /api/finance/stock/tasi/summary/daily/latest`**, **`GET /api/finance/stock/tasi/company/daily/latest`**. Legacy: `GET /api/finance/market/.../latest?market=TASI`.
- **Funds — overview `stockList` + MACD** (latest bar per symbol, not full daily rows): `GET /api/finance/overview/stock-list?symbols=...&startDate=...&endDate=...` (optional `syncIfEmpty`).
- **Do not** use exchange `market=` feed paths for non-TASI markets — they return **400**; use **`/api/finance/stock/summary`** for other overview indices.

## Hard boundaries (must check before call)

- Exchange feed paths under `market/...` and `stock/tasi/...` are **TASI-only** in current implementation; non-TASI requests must be redirected to `get_stock_summary`.
- Do not mix **fund NAV** and **exchange OHLCV** tools: NAV symbols/routes use `get_fund_nav_daily*`, while OHLCV uses `get_market_daily*`.
- Current precious metals scope is **XAUUSD only**; do not imply support for other metals unless route/tool exists.

## Pre-check (before tool call)

- Classify intent first: stock index snapshot vs TASI feed vs fund NAV vs fund OHLCV vs precious metal.
- Validate symbol/date requirements per endpoint mode before calling.
- For non-TASI index needs, route to `get_stock_summary` directly.

## Fallback (when not suitable)

- If symbol/market mapping is ambiguous, ask user to confirm instrument and market once.
- If request falls outside current scope (e.g. non-XAUUSD precious), explain unsupported scope and avoid fabricating output.

## Retry policy

- Retry only on transient **5xx** failures or temporary upstream sync gaps.
- Do not retry unchanged validation/mode mismatch errors (**400**) until parameters or route are corrected.

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

`GET /api/finance/stock/tasi/company/daily` — K-line if `code` + `from` + `to` present. Legacy: `GET /api/finance/market/company/daily?market=TASI`.

| Mode                  | Query                               |
| --------------------- | ----------------------------------- |
| Latest snapshot       | `market=TASI` or omit `market`      |
| Single historical day | `date=YYYY-MM-DD`                   |
| Company K-line        | `code=<ticker>` `from=...` `to=...` |

### Stocks — index daily (TASI index feed / Turso)

`GET /api/finance/stock/tasi/summary/daily` — **canonical** (slug `tasi`). Legacy: `GET /api/finance/market/summary/daily?market=TASI`.

| Mode         | Query                             |
| ------------ | --------------------------------- |
| Latest       | _(none)_ or `market=TASI`         |
| Single day   | `date=YYYY-MM-DD`                 |
| Index K-line | `from=YYYY-MM-DD` `to=YYYY-MM-DD` |

### Stocks — index hourly alignment

`GET /api/finance/stock/tasi/summary/hourly` — **TASI only**; no query params. Legacy: `GET /api/finance/market/summary/hourly?market=TASI`.

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
GET /api/finance/stock/tasi/company/daily
GET /api/finance/stock/tasi/company/daily?date=2026-03-01
GET /api/finance/stock/tasi/company/daily?code=1120&from=2026-01-01&to=2026-03-01
GET /api/finance/stock/tasi/summary/daily
GET /api/finance/stock/tasi/summary/daily?date=2026-03-01
GET /api/finance/stock/tasi/summary/daily?from=2026-01-01&to=2026-03-01
GET /api/finance/stock/tasi/summary/hourly
GET /api/finance/stock/tasi/daily/latest
```

## MCP / function calling (same `tool` names as POST `/api/mcp/finance`)

| Tool                              | Role                                                                                                                                                                                                                                                                                    |
| --------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `get_stock_summary`               | Latest snapshot: `market` or `markets` (comma-separated).                                                                                                                                                                                                                               |
| `get_market_company_daily`        | TASI company rows; optional `market` (default TASI); `date` or `code`+`from`+`to`.                                                                                                                                                                                                      |
| `get_market_summary_daily`        | TASI index daily / K-line; optional `market` (default TASI).                                                                                                                                                                                                                            |
| `get_market_summary_hourly`       | TASI SAHMK alignment; optional `market` (default TASI).                                                                                                                                                                                                                                 |
| `get_market_daily`                | Exchange OHLCV only: `symbols`, `startDate`, `endDate`; optional `withIndicators` (legacy cold-start by default), `indicatorWarmup` (120 days), `indicatorWarmupDays` (35-250); optional `syncIfEmpty` (default **true**), optional `forceSync`. Fund NAV codes → `get_fund_nav_daily`. |
| `get_market_daily_latest`         | Latest one OHLCV bar per symbol: `symbols` only; optional `withIndicators` (default **true**, pass `false` to skip MACD streak); optional `syncIfEmpty` (default **true**). Returns `{ asOf, items, synced }`.                                                                          |
| `get_fund_nav_daily`              | Fund NAV only: same `symbols` / dates; optional `syncIfEmpty` (default **true** for allowlisted NAV catalog). Returns `{ items, synced }` with `unitNav` + `dailyChangePercent`.                                                                                                        |
| `get_fund_nav_daily_latest`       | Latest one NAV row per symbol: `symbols` only; optional `syncIfEmpty` (default **true**). Returns `{ asOf, items, synced }`.                                                                                                                                                            |
| `get_market_summary_daily_latest` | TASI index latest session; optional `market` (default TASI). Returns `{ asOf, dataDate, summary }`.                                                                                                                                                                                     |
| `get_market_company_daily_latest` | TASI all companies latest session; optional `market` (default TASI). Returns `{ asOf, dataDate, items }`.                                                                                                                                                                               |
| `get_overview_stock_list`         | Same date range + `symbols`; optional `syncIfEmpty`. Returns `{ stockList, synced }` — **one row per symbol** (latest bar + MACD streak), not the full daily series (`get_market_daily`).                                                                                               |

## Response

Same envelope: **`{ code: 0, message: "ok", data: … }`**. **`data`** may be `[]` or `null` on **200** — treat as no rows, not a transport error.

- **`/api/finance/stock/summary`:** `data` is `{ market, summary }` (single) or `{ items }` (batch), not a bare `ok` flag.
- **`/api/finance/fund/{symbol}/ohlcv/daily`** and legacy **`/api/finance/market/daily`:** `data` is `{ items, synced }` with **exchange OHLCV** rows only (`items[].open` … `turnoverRate`; when `withIndicators=true`, `ema12`/`ema26`/`dif`/`dea`/`macd` plus `macdUp`/`macdDown`).
- **`/api/finance/fund/{symbol}/ohlcv/daily/latest`** and legacy **`/api/finance/market/daily/latest`:** `data` is `{ asOf, items, synced }` — one latest bar; **`asOf`** is ISO-8601; **`items[].date`** is the bar’s calendar trade date.
- **`/api/finance/fund/{symbol}/nav/daily`** and legacy **`/api/finance/fund/nav/daily`:** `data` is `{ items, synced }` with **fund NAV** rows (`items[].unitNav`, `items[].dailyChangePercent` only).
- **`/api/finance/fund/{symbol}/nav/daily/latest`** and legacy **`/api/finance/fund/nav/daily/latest`:** `data` is `{ asOf, items, synced }`.
- **`/api/finance/stock/tasi/summary/daily/latest`** (legacy **`/api/finance/market/summary/daily/latest`**): `data` is `{ asOf, dataDate, summary }`.
- **`/api/finance/stock/tasi/company/daily/latest`** (legacy **`/api/finance/market/company/daily/latest`**): `data` is `{ asOf, dataDate, items }`.
- **`/api/finance/stock/tasi/daily/latest`**: `data` is `{ asOf, dataDate, summary, items }`.

## Examples

- User: “Nasdaq summary today” → `GET /api/finance/stock/summary?market=Nasdaq`.
- User: “TASI market summary today” → `GET /api/finance/stock/tasi/summary/daily` (or legacy `GET /api/finance/market/summary/daily?market=TASI`).
- User: “Company 1120 from 2026-01-01 to 2026-03-01” on TASI → `GET /api/finance/stock/tasi/company/daily?code=1120&from=2026-01-01&to=2026-03-01`.

## Agent rules

**GET** only; if TASI feed path returns **400**, read `message` and prefer **`/api/finance/stock/summary`** for non-TASI index snapshots.
