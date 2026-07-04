---
name: finance
description: Stocks (multi-market index snapshot + daily summary via stock/summary, incl. TASI), funds (six-digit OHLCV vs NAV daily), precious metals (XAUUSD) — pick the matching REST path or MCP tool.
---

# Finance API — Stocks / Funds / Precious metals (agent-ready)

## Taxonomy (same as sidebar)

| Major               | Meaning                                                                                                                                                                                               |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Stocks**          | Stock market: multi-market **index snapshot** (latest) and **index daily summary** (latest / date / range) — TASI **constituent company daily is not supported** (use index snapshot instead).        |
| **Funds**           | Six-digit **daily** data in **two shapes**: **exchange daily bars (OHLCV)** vs **NAV disclosure (unit + daily %)**.                                                                                   |
| **Precious metals** | Spot **XAUUSD** daily OHLCV via **`GET /api/finance/fund/XAUUSD/ohlcv/daily`** (canonical; legacy `market/daily?symbols=XAUUSD`); Turso `source=eastmoney-precious-spot`. Only XAUUSD in scope today. |

## When to use

- **Stocks — index snapshot (all overview markets, including TASI)** — **`GET /api/finance/stock/summary?market=...`** or batch `markets=...`. **TASI latest index → `GET /api/finance/stock/summary?market=TASI`** (canonical; same as other markets).
- **Stocks — index daily summary (all overview markets)** — **`GET /api/finance/stock/summary/daily?market=...`**. No date params → **latest** (same data as `/stock/summary`); optional `date=YYYY-MM-DD` (single historical day) or `from`+`to` (range, max 365 days → `data.items`). TASI history from the TASI Turso feed; other markets from `finance_stock_summary_daily`.
- **Stocks — TASI constituents** — **not supported** for latest/full list; use **`/api/finance/stock/summary?market=TASI`** for the index.
- **Funds / precious spot — exchange-style daily OHLCV (canonical)** — **`GET /api/finance/fund/{symbol}/ohlcv/daily?startDate=...&endDate=...`** (`{symbol}` six-digit or `XAUUSD`; optional `withIndicators=true` adds MACD fields using legacy window cold-start by default; optional `indicatorWarmup=true` uses 120 calendar days; optional `indicatorWarmupDays=35..250` sets the lookback; optional `forceSync=true` refreshes allowlisted cached ranges). Multi-symbol batch legacy: `GET /api/finance/market/daily?symbols=...`.
- **Funds / precious — latest one OHLCV bar** — **`GET /api/finance/fund/{symbol}/ohlcv/daily/latest`** (same path shape as `market/daily/latest`). Legacy: `GET /api/finance/market/daily/latest?symbols=...`.
- **Funds — NAV disclosure daily series (canonical)** — **`GET /api/finance/fund/{symbol}/nav/daily?startDate=...&endDate=...`**. Legacy: `GET /api/finance/fund/nav/daily?symbols=...`.
- **Funds — latest one NAV row** — **`GET /api/finance/fund/{symbol}/nav/daily/latest`**. Legacy: `GET /api/finance/fund/nav/daily/latest?symbols=...`.
- **Funds — overview `stockList` + MACD** (latest bar per symbol, not full daily rows): `GET /api/finance/overview/stock-list?symbols=...&startDate=...&endDate=...` (optional `syncIfEmpty`).
- **Do not** use exchange `market=` feed paths for non-TASI markets — they return **400**; use **`/api/finance/stock/summary`** for other overview indices.

## Hard boundaries (must check before call)

- **TASI company list / latest constituents** — not available. Use **`GET /api/finance/stock/summary?market=TASI`** or MCP **`get_stock_summary`**.
- On `/api/finance/stock/summary/daily`, non-TASI markets return historical rows only for dates the daily ingest has written (`finance_stock_summary_daily`); missing days come back as `null` (single) or are absent from `items` (range), not an error.
- Do not mix **fund NAV** and **exchange OHLCV** tools: NAV symbols/routes use `get_fund_nav_daily*`, while OHLCV uses `get_market_daily*`.
- Current precious metals scope is **XAUUSD only**; do not imply support for other metals unless route/tool exists.

## Pre-check (before tool call)

- Classify intent first: stock index latest snapshot vs stock index daily summary (date/range) vs fund NAV vs fund OHLCV vs precious metal.
- For **TASI index latest** → `get_stock_summary` / `/api/finance/stock/summary?market=TASI`.
- For **TASI company list** → explain unsupported; offer index snapshot instead.
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
- **Index range summary:** requires **`from`** and **`to`** together. If only one date is given, treat it as `date` (single day) or ask for the range.

## Parameters (canonical REST)

### Stocks — index snapshot (all overview markets, including TASI)

`GET /api/finance/stock/summary`

| Mode   | Query                                                                                          |
| ------ | ---------------------------------------------------------------------------------------------- |
| Single | `market=TASI` (default) or `market=S%26P%20500`, `Dow%20Jones`, `Nasdaq`, …                    |
| Batch  | `markets=TASI,S%26P%20500,Dow%20Jones` (comma-separated; same per-market cold-start as single) |

**HTTP 200 body:** `{ "code": 0, "message": "ok", "data": … }` — single: `data: { "market", "summary" }`; batch: `data: { "items": [...] }`.

### Stocks — index daily summary (all overview markets)

`GET /api/finance/stock/summary/daily` — one market per request via `market=` (default TASI).

| Mode       | Query                                                         |
| ---------- | ------------------------------------------------------------- |
| Latest     | `market=TASI` (default) — same data as `/stock/summary`       |
| Single day | `market=...` `date=YYYY-MM-DD`                                |
| Range      | `market=...` `from=YYYY-MM-DD` `to=YYYY-MM-DD` (max 365 days) |

**HTTP 200 body:** latest / single day → `data: { "market", "summary" }`; range → `data: { "market", "items": [...] }`. Do not send `date` together with `from`/`to`.

## Steps

0. **Conversation cache:** Same full URL already returned **HTTP 200** with usable `data` → reuse.
1. **Choose path:** stocks latest snapshot (incl. TASI) → **stock/summary**; stocks historical / range summary → **stock/summary/daily** (`date` or `from`+`to`); funds → **fund/…/ohlcv** vs **fund/…/nav** vs **overview/stock-list**.
2. **Validate** required query parts for that mode.
3. **GET** only (no body).
4. **Check HTTP** then envelope `{ code, message, data }` on **200**.
5. **Summarize** from `data` — never invent numbers.

## Request examples

```http
GET /api/finance/stock/summary?market=TASI
GET /api/finance/stock/summary?market=Nasdaq
GET /api/finance/stock/summary/daily?market=TASI&date=2026-03-01
GET /api/finance/stock/summary/daily?market=TASI&from=2026-01-01&to=2026-03-01
```

## MCP / function calling (same `tool` names as POST `/api/mcp/finance`)

### Primary tools

| Tool                        | Role                                                                                                                                                                                                                                 |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `get_stock_summary`         | **Primary for TASI latest index** and all markets: `market` or `markets` (comma-separated). Same as `GET /api/finance/stock/summary`.                                                                                                |
| `get_market_daily`          | Exchange OHLCV only: `symbols`, `startDate`, `endDate`; optional `withIndicators`, `indicatorWarmup`, `indicatorWarmupDays`; optional `syncIfEmpty` (default **true**), optional `forceSync`. Fund NAV codes → `get_fund_nav_daily`. |
| `get_market_daily_latest`   | Latest one OHLCV bar per symbol: `symbols` only; optional `withIndicators` (default **true**); optional `syncIfEmpty` (default **true**). Returns `{ asOf, items, synced }`.                                                         |
| `get_fund_nav_daily`        | Fund NAV only: same `symbols` / dates; optional `syncIfEmpty` (default **true**). Returns `{ items, synced }` with `unitNav` + `dailyChangePercent`.                                                                                 |
| `get_fund_nav_daily_latest` | Latest one NAV row per symbol: `symbols` only; optional `syncIfEmpty` (default **true**). Returns `{ asOf, items, synced }`.                                                                                                         |
| `get_overview_stock_list`   | Same date range + `symbols`; optional `syncIfEmpty`. Returns `{ stockList, synced }` — **one row per symbol** (latest bar + MACD streak), not the full daily series (`get_market_daily`).                                            |

### Legacy TASI feed tools (still registered)

| Tool                              | Role                                                                                                                     |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `get_market_summary_daily`        | TASI index historical K-line / past date only; optional `market` (default TASI). **Latest index → `get_stock_summary`.** |
| `get_market_summary_hourly`       | TASI SAHMK hourly alignment vs daily summary; optional `market` (default TASI). Not for index snapshots.                 |
| `get_market_summary_daily_latest` | **Deprecated** for TASI latest — use `get_stock_summary`. Feed latest session when needed for migration only.            |

### Removed MCP tools

`get_market_company_daily` and `get_market_company_daily_latest` are **unregistered**. TASI constituents are not supported — use `get_stock_summary` for index data.

## Response

Same envelope: **`{ code: 0, message: "ok", data: … }`**. **`data`** may be `[]` or `null` on **200** — treat as no rows, not a transport error.

- **`/api/finance/stock/summary`:** `data` is `{ market, summary }` (single) or `{ items }` (batch), not a bare `ok` flag. **Use for TASI latest index.**
- **`/api/finance/fund/{symbol}/ohlcv/daily`** and legacy **`/api/finance/market/daily`:** `data` is `{ items, synced }` with **exchange OHLCV** rows only (`items[].open` … `turnoverRate`; when `withIndicators=true`, `ema12`/`ema26`/`dif`/`dea`/`macd` plus `macdUp`/`macdDown`).
- **`/api/finance/fund/{symbol}/ohlcv/daily/latest`** and legacy **`/api/finance/market/daily/latest`:** `data` is `{ asOf, items, synced }` — one latest bar; **`asOf`** is ISO-8601; **`items[].date`** is the bar’s calendar trade date.
- **`/api/finance/fund/{symbol}/nav/daily`** and legacy **`/api/finance/fund/nav/daily`:** `data` is `{ items, synced }` with **fund NAV** rows (`items[].unitNav`, `items[].dailyChangePercent` only).
- **`/api/finance/fund/{symbol}/nav/daily/latest`** and legacy **`/api/finance/fund/nav/daily/latest`:** `data` is `{ asOf, items, synced }`.
- **`/api/finance/stock/summary/daily`:** latest / single day → `data` is `{ market, summary }`; range (`from`+`to`) → `data` is `{ market, items }`. `summary`/`items` may be `null`/`[]` on **200** when no row exists for that date.

## Examples

- User: “TASI summary today” → `GET /api/finance/stock/summary?market=TASI`.
- User: “Nasdaq summary today” → `GET /api/finance/stock/summary?market=Nasdaq`.
- User: “TASI index daily Jan–Mar 2026” → `GET /api/finance/stock/summary/daily?market=TASI&from=2026-01-01&to=2026-03-01`.
- User: “TASI all companies today” → explain constituents not supported; offer `GET /api/finance/stock/summary?market=TASI` for index snapshot.

## Agent rules

**GET** only; if TASI company feed path returns **400**, read `message` and use **`/api/finance/stock/summary?market=TASI`** for index data.
