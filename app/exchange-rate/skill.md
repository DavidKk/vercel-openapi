---
name: exchange-rate
description: When a user asks for FX rates or currency conversion → return exchange rates or the converted amount.
---

# Exchange Rate API – Rates & conversion (agent-ready)

## When to use

- User wants **latest FX rates** for a base currency, or **convert an amount** between two currencies.
- Trigger phrasings include: “USD to CNY”, “how much is 100 EUR in JPY”, “exchange rate”, “convert currency”, `base=EUR` style queries.
- **Do not** call for unrelated topics (weather, stocks, generic chat).
- **Do not overuse:** unrelated intent → do not call this API.

## Multi-turn / Missing parameters

- **GET /api/exchange-rate:** `base` is optional (default USD). Parse ISO currency codes from text if unambiguous.
- **POST /api/exchange-rate:** body must include `from`, `to` (strings), `amount` (number). **Parse first** (e.g. “100 USD to EUR”); if any field missing, **do not** guess — ask once for `from`, `to`, and `amount` as explicit values.

## Parameters

- **GET** `base` (optional, string): base currency code, default **USD** (e.g. USD, EUR, CNY).
- **POST** `from` (string, required), `to` (string, required), `amount` (number, required): conversion request.

## Steps

0. **Conversation cache:** If the same **GET query** or **POST body** already returned **200** in this conversation, **reuse** `data`; skip the HTTP call; go to formatting only.
1. **Validate** inputs (currency codes present for POST; `amount` finite and sensible). On failure → **Multi-turn**.
2. **Call** `GET /api/exchange-rate` or `GET /api/exchange-rate?base=...` for rates; **POST** `/api/exchange-rate` with JSON body for conversion.
3. **Check HTTP status** and envelope `{ code, message, data }`.
4. **Extract** `data`: rates object and `date` for GET; `from`, `to`, `amount`, `result`, `rate`, `date` for POST.
5. **Format** a short user-facing summary (numbers + currencies + date if useful).

## Request

**GET** (cacheable, short TTL on server):

`GET /api/exchange-rate`
`GET /api/exchange-rate?base=EUR`

**POST** `Content-Type: application/json`:

`{ "from": "USD", "to": "EUR", "amount": 100 }`

## Response

Standard envelope `{ code, message, data }` on success paths used by this route.

- **200** — GET: `data` includes `base`, `date`, `rates` (map of currency → rate). POST: `data` includes conversion fields above.
- **400** — invalid `base` or invalid POST body → **do not retry** blindly; fix parameters / ask user.

## Say to the user (one line)

- GET: summarize base + a few key rates or the full set if user asked for one pair.
- POST: “`amount` `from` ≈ `result` `to` (rate ...)” style.

## Output language

- Keep **currency codes** and **numbers** as returned; explain in the **user’s language** for errors and prompts.

## Idempotency & cache (conversation)

- **Step 0** applies: identical GET URL or POST JSON → reuse prior **200** `data` in the same conversation.

## Examples

- User: “What’s the rate for EUR as base?” → GET `/api/exchange-rate?base=EUR` → summarize `data.rates` (verify live `data`).
- User: “Convert 50 USD to CNY” → POST body `{ "from":"USD","to":"CNY","amount":50 }` → report `result` (verify live `data`).
- User: “What’s the weather?” → **Do not call this API**; use weather or other tools.

## Agent rules

Prefer **GET** for rate lookup; **POST** only for conversion; follow **Steps**.

## Error handling (HTTP)

- **400:** Invalid `base` or malformed conversion body — clarify required fields, **do not retry** with the same bad payload.
- **200** with business logic errors: follow `message` / `data` if present.
