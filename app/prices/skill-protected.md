---
name: prices
description: When a user is authenticated and wants admin product write access → allow create/update/delete products.
---

# Prices API – Public + admin (agent-ready)

## Base URL

Paths use **`BASE_URL` + `/api/prices/...`** (host + optional app prefix, then the path). See the public skill for the same **Base URL** rules: third parties set `BASE_URL` to your deployment origin (no trailing slash); this site’s Skill panel replaces `BASE_URL` on copy/download.

## When to use

- User wants **product list**, **keyword search**, or **unit-price comparison** (“which cola is cheaper per liter”) using this service’s catalog.
- **Do not** call for unrelated shopping math without using **POST BASE_URL/api/prices/calc** inputs the API accepts.
- **Do not overuse:** unrelated intent → do not call.

## Multi-turn / Missing parameters

- **Search:** need `q` (keyword). If missing, ask once.
- **Calc:** need either `productId` **or** `productName`, plus `totalPrice`, `totalQuantity`; optional `quantityUnit`. **Parse first**; **do not** guess product IDs.

## Parameters

- **GET** `BASE_URL/api/prices/products` — no params.
- **GET** `BASE_URL/api/prices/products/search?q=` — `q` required.
- **POST** `BASE_URL/api/prices/calc` — JSON body per **Request** examples in code/spec.

## Steps

0. **Conversation cache:** Same GET URL or POST body already **200** in this conversation → **reuse** `data`.
1. **Choose** list vs search vs calc; **validate** required fields.
2. **Call** the endpoint.
3. **Check** HTTP status and envelope `{ code, message, data }`.
4. **Extract** `data` (product array, search hits, or `comparisons`).
5. **Format** a short answer (best deal, list top matches, etc.).

## Request

`GET BASE_URL/api/prices/products`

`GET BASE_URL/api/prices/products/search?q=cola`

`POST BASE_URL/api/prices/calc` — `Content-Type: application/json`, e.g.:
`{ "productId": "12", "totalPrice": 12.5, "totalQuantity": 1.5, "quantityUnit": "L" }`
or `{ "productName": "cola", "totalPrice": 10, "totalQuantity": "= 1000 ml" }`

## Response

Standard envelope `{ code, message, data }` on success.

- **200** — `data` shape per route (product list, search results, or calc `target` / `input` / `comparisons`).

## Say to the user (one line)

- For calc: state **unit comparison** outcome clearly; cite product name from `data`.

## Output language

- **User’s language** for explanations; keep **product names** and **numbers** as returned.

## Idempotency & cache (conversation)

- Reuse identical requests in the same conversation.

## Examples

- User: “Search products cola” → `GET BASE_URL/api/prices/products/search?q=cola`.
- User: “Compare price for cola at 12.5 for 1.5L” → **POST** calc with parsed body (verify `data`).
- User: “DNS lookup” → **Do not call this API**.

## Agent rules

Public routes only in this document; **admin** requires Bearer key (see extended skill if authorized).

## Error handling (HTTP)

- **4xx:** fix params/body; **no** blind retry.
- **5xx:** retry later.

---

## ADMIN – Product write API (Bearer token; agent-ready)

### When to use

- Only when the user (or deployment) has a valid **API key** and explicitly wants **create / update / delete** products in this system.
- **Do not** expose or embed the real key in client-visible skill text.

### Steps

0. Reuse prior successful **same** admin response in conversation if repeating an idempotent read-back (optional).
1. Set header `Authorization: Bearer <API_KEY>` (from server env / secrets, never hardcode in public docs).
2. **POST** create, **PUT** update, **DELETE** delete as below.
3. Check status and envelope.

### Request (examples)

Create:
`POST BASE_URL/api/prices/products` with JSON body `{ "name", "brand", "unit", "unitBestPrice", "unitConversions", "remark?" }`

Update:
`PUT BASE_URL/api/prices/products?id={id}` with partial JSON fields.

Delete:
`DELETE BASE_URL/api/prices/products?id={id}`

### Error handling

- **401/403:** stop; do not retry without valid credentials.

### Examples (negative)

- User without key asks to “delete product 12” → **Do not call** admin routes; explain auth is required.
