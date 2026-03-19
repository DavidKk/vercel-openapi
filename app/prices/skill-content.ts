/**
 * API skill document for agents: how to use prices-related endpoints.
 * Use BASE_URL as placeholder; replaced with current origin when copying/downloading.
 */
export const PRICES_API_SKILL = `# Prices API - HTTP usage for agents

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

## GET /api/prices/products/search?q={keyword} - Search public product data

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

- Endpoints above are public and do not require login.
- Manage/write capabilities remain login-protected.
`
