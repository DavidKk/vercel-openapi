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
- If user wants a range but only one date given, ask once for **from** and **to** — **do not** guess.

## Parameters

**Company daily** `GET /api/finance/tasi/company/daily`:

- (none) — today / latest feed behavior per implementation.
- `date=YYYY-MM-DD` — single day from store.
- `code` + `from` + `to` — company K-line.

**Market summary** `GET /api/finance/tasi/summary/daily`:

- (none) — today.
- `date=YYYY-MM-DD` — single day.
- `from` + `to` — market K-line range.

## Steps

0. **Conversation cache:** Same full URL already **200** in this conversation → **reuse** `data`.
1. **Map** user intent to **company** vs **summary** endpoint and query combo.
2. **Validate** date formats and required triple (`code`, `from`, `to`) when K-line is requested.
3. **Call** the appropriate **GET**.
4. **Check HTTP status** and JSON shape (array vs object per route).
5. **Format** a compact summary (headline numbers, row count, or sample row).

## Request

`GET /api/finance/tasi/company/daily`
`GET /api/finance/tasi/company/daily?date=2025-03-01`
`GET /api/finance/tasi/company/daily?code=1120&from=2025-01-01&to=2025-03-01`

`GET /api/finance/tasi/summary/daily`
`GET /api/finance/tasi/summary/daily?date=2025-03-01`
`GET /api/finance/tasi/summary/daily?from=2025-01-01&to=2025-03-01`

## Response

- **200** — JSON **array** or **object** with OHLC/volume-style fields per spec; follow **live** payload.
- Errors: follow HTTP status and message body.

## Say to the user (one line)

- State date (or range), key metrics, and data source caveat if sparse.

## Output language

- **User’s language** for explanation; keep **numeric** and **codes** as returned.

## Idempotency & cache (conversation)

- Reuse identical GET results in the same conversation.

## Examples

- User: “TASI market summary today” → `GET /api/finance/tasi/summary/daily`.
- User: “Company 1120 from 2025-01-01 to 2025-03-01” → company daily with `code`/`from`/`to`.
- User: “Fuel price in Beijing” → **Do not call this API**.

## Agent rules

**GET** only; follow **Steps**; align queries with **Parameters**.

## Error handling (HTTP)

- **400** / **404** (if returned): fix query; **no** blind retry.
- **5xx:** retry later.
