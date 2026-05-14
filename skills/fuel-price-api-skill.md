# China Fuel Price API – Provinces & promo (agent-ready)

## When to use

- User wants **current (or previous) fuel prices** in **China by province**, or **recharge promo** math for a province.
- Triggers: phrases about **fuel price** / **gasoline grade + province** / **province price** / **recharge promo** (any language).
- **Do not** call for non-China fuel data unless the API is extended.
- **Do not overuse:** unrelated intent → do not call.

## Multi-turn / Missing parameters

- **All provinces:** no path params — `GET /api/fuel-price`.
- **Single province:** need **province** path segment (format accepted by the API). **Parse first**; if missing, ask once.
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
Example: `GET /api/fuel-price/Beijing` (or locale slug your API expects)

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

- User: “Today’s fuel price in Beijing” → `GET /api/fuel-price/Beijing` → summarize `current`.
- User: “Nationwide fuel prices” → `GET /api/fuel-price`.
- User: “DNS lookup example.com” → **Do not call this API**.

## Agent rules

**GET only** for these paths; follow **Steps**.

## Error handling (HTTP)

- **400** / **404** (if used): fix province or query params; **do not** retry same bad URL.
- **5xx:** suggest retry later.
