---
name: fuel-price
description: When a user asks for China fuel prices by province or a recharge promo → return current/previous prices or promo result.
---

# Fuel Price API – China provinces & promo (agent-ready)

## When to use

- User wants **current (or previous) fuel prices** in **China by province**, or **recharge promo** math for a province.
- Triggers: “油价”, “92号汽油 北京”, “fuel price Guangdong”, “promo bonus 加油”.
- **Do not** call for non-China fuel data unless the API is extended.
- **Do not overuse:** unrelated intent → do not call.

## Multi-turn / Missing parameters

- **All provinces:** no path params — `GET /api/fuel-price`.
- **Single province:** need **province** segment (Chinese or English as API accepts, e.g. 北京, Beijing). **Parse first**; if missing, ask once.
- **Promo:** need `province`, `amount`, `bonus`; optional `fuelType` (`b92`|`b95`|`b98`|`b0`, default `b92`). If missing, ask — **do not** guess amounts.

## Parameters

- Path `:province` — province name for single-province and promo routes.
- Promo query: `fuelType` (optional), `amount` (**required**), `bonus` (**required**).

## Steps

0. **Conversation cache:** Same full URL (path + query) already **200** in this conversation → **reuse** `data`.
1. **Choose endpoint:** all provinces vs one province vs promo; **validate** required params.
2. **Call** the appropriate **GET** (see **Request**).
3. **Check HTTP status** and response shape (JSON as returned by route).
4. **Extract** `current` / `previous` / `latestUpdated` or promo fields from payload.
5. **Format** a short summary (prices per grade or promo outcome).

## Request

**All provinces:**
`GET /api/fuel-price`

**Single province:**
`GET /api/fuel-price/{province}`
Example: `GET /api/fuel-price/北京`

**Promo (recharge):**
`GET /api/fuel-price/{province}/promo?fuelType=b92&amount=500&bonus=50`

## Response

JSON with **current** / **previous** arrays of province rows (`b92`, `b95`, `b98`, `b0`, etc.) and timestamps; promo route returns shape defined by implementation — read live `data` for edge fields.

## Say to the user (one line)

- Quote relevant grades and province; for promo, state computed benefit in plain language.

## Output language

- Use **user’s language** for explanations; keep **numeric** and **API field names** as returned where helpful.

## Idempotency & cache (conversation)

- Reuse identical GET results in the same conversation.

## Examples

- User: “北京今天油价” → `GET /api/fuel-price/北京` → summarize `current`.
- User: “全国油价” → `GET /api/fuel-price`.
- User: “DNS lookup example.com” → **Do not call this API**.

## Agent rules

**GET only** for these paths; follow **Steps**.

## Error handling (HTTP)

- **400** / **404** (if used): fix province or query params; **do not** retry same bad URL.
- **5xx:** suggest retry later.
