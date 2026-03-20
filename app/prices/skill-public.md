---
name: prices
description: When a user searches products or compares/calc totals → return product list/search/calc results (public).
---

# Prices API – Products, search, calc (public; agent-ready)

## When to use

- User wants **product list**, **keyword search**, or **unit-price comparison** (“which cola is cheaper per liter”) using this service’s catalog.
- **Do not** call for unrelated shopping math without using **POST /api/prices/calc** inputs the API accepts.
- **Do not overuse:** unrelated intent → do not call.

## Multi-turn / Missing parameters

- **Search:** need `q` (keyword). If missing, ask once.
- **Calc:** need either `productId` **or** `productName`, plus `totalPrice`, `totalQuantity`; optional `quantityUnit`. **Parse first**; **do not** guess product IDs.

## Parameters

- **GET** `/api/prices/products` — no params.
- **GET** `/api/prices/products/search?q=` — `q` required.
- **POST** `/api/prices/calc` — JSON body per **Request** examples in code/spec.

## Steps

0. **Conversation cache:** Same GET URL or POST body already **200** in this conversation → **reuse** `data`.
1. **Choose** list vs search vs calc; **validate** required fields.
2. **Call** the endpoint.
3. **Check** HTTP status and envelope `{ code, message, data }`.
4. **Extract** `data` (product array, search hits, or `comparisons`).
5. **Format** a short answer (best deal, list top matches, etc.).

## Request

`GET /api/prices/products`

`GET /api/prices/products/search?q=cola`

`POST /api/prices/calc` — `Content-Type: application/json`, e.g.:
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

- User: “Search products cola” → `GET /api/prices/products/search?q=cola`.
- User: “Compare price for cola at 12.5 for 1.5L” → **POST** calc with parsed body (verify `data`).
- User: “DNS lookup” → **Do not call this API**.

## Agent rules

Public routes only in this document; **admin** requires Bearer key (see extended skill if authorized).

## Error handling (HTTP)

- **4xx:** fix params/body; **no** blind retry.
- **5xx:** retry later.
