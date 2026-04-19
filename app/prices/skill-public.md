---
name: prices
description: When a user searches products or compares/calc totals → return product list/search/calc results (public).
---

# Prices API – Products, search, calc (public; agent-ready)

## Base URL

Paths are written as **`BASE_URL` + root path** (e.g. `BASE_URL/api/prices/...`).

- **Third-party / offline agents:** set **`BASE_URL`** to the deployment origin that serves this API (e.g. `https://your-app.vercel.app`), **no trailing slash**. If the app is mounted under a subpath, include that path in `BASE_URL` (e.g. `https://example.com/my-app`).
- **This site’s Skill tab (copy / download):** the Skill panel replaces the literal substring **`BASE_URL`** with the **current page origin** plus any **base path** inferred from the URL (same behavior as other modules that use this placeholder).

If you only use a root-relative path like `/api/prices/products` without a host, the HTTP client must already be configured with the correct **Host** (typical for same-origin browser calls).

## When to use

- User wants **product list**, **keyword search**, or **unit-price comparison** (“which cola is cheaper per liter”) using this service’s catalog.
- **Do not** call for unrelated shopping math without using **`POST BASE_URL/api/prices/calc`** with inputs the API accepts.
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
