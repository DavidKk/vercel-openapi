/**
 * API skill document for agents: how to use prices-related endpoints.
 * Use BASE_URL as placeholder; replaced with current origin when copying/downloading.
 */
export const PRICES_API_SKILL_PUBLIC = `# Prices API - HTTP usage for agents

Base URL: BASE_URL

## GET /api/prices/products - List all products

Returns the full product list. No auth required.

Example:
  GET BASE_URL/api/prices/products

Response (200): JSON
  {
    "code": 0,
    "message": "ok",
    "data": [ ... ]
  }

## GET /api/prices/products/search?q={keyword} - Search product data

Example:
  GET BASE_URL/api/prices/products/search?q=cola

Returns matched lists and products by keyword.

## POST /api/prices/calc - Calculate comparison results

Body (JSON):
  {
    "productId": "12",
    "totalPrice": 12.5,
    "totalQuantity": 1.5,
    "quantityUnit": "L"
  }

Or by productName:
  {
    "productName": "cola",
    "totalPrice": 10,
    "totalQuantity": "= 1000 ml"
  }

Response (200): JSON
  {
    "code": 0,
    "message": "ok",
    "data": {
      "target": { "productId": "12", "productName": "cola" },
      "input": { "totalPrice": "12.5", "totalQuantity": "= 1.5 L" },
      "comparisons": [ ... ]
    }
  }

## cURL quick examples

List:
  curl -X GET "BASE_URL/api/prices/products"

Search:
  curl -X GET "BASE_URL/api/prices/products/search?q=cola"

Calc:
  curl -X POST "BASE_URL/api/prices/calc" \\
    -H "Content-Type: application/json" \\
    -d '{"productName":"cola","totalPrice":12.5,"totalQuantity":1.5,"quantityUnit":"L"}'

## Notes

- Endpoints above are read-only and do not require admin login.
- Manage/write capabilities remain ADMIN-protected (login required).
`

export const PRICES_API_SKILL_PROTECTED = `${PRICES_API_SKILL_PUBLIC}

## ADMIN (Protected): Product management (login required)

These endpoints modify stored product data. They require an authenticated request.

ADMIN access is controlled by an API key. Include the following header in your requests:

- Authorization: Bearer <API_KEY>

API KEY storage note:
- The real API KEY should be stored/configured on the server via environment variables (or deployment secrets).
- Do not embed secrets directly into client code; examples use placeholders.

### Create product

curl -X POST \"BASE_URL/api/prices/products\" \\
  -H \"Content-Type: application/json\" \\
  -H \"Authorization: Bearer <API_KEY>\" \\
  -d '{
    \"name\": \"cola\",
    \"brand\": \"Acme\",
    \"unit\": \"L\",
    \"unitBestPrice\": 1.23,
    \"unitConversions\": [\"= 1000 ml\"],
    \"remark\": \"optional\"
  }'

### Update product

curl -X PUT \"BASE_URL/api/prices/products?id=12\" \\
  -H \"Content-Type: application/json\" \\
  -H \"Authorization: Bearer <API_KEY>\" \\
  -d '{
    \"unitBestPrice\": 1.29
  }'

### Delete product

curl -X DELETE \"BASE_URL/api/prices/products?id=12\" \\
  -H \"Authorization: Bearer <API_KEY>\" 
`

/**
 * Backward-compatible export.
 * Unauthenticated users should fetch {@link PRICES_API_SKILL_PUBLIC} via UI APIs.
 */
export const PRICES_API_SKILL = PRICES_API_SKILL_PUBLIC
