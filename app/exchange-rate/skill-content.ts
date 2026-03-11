/**
 * API skill document for agents: how to call Exchange Rate HTTP API.
 * Use BASE_URL as placeholder; replaced with current origin when copying/downloading.
 */
export const EXCHANGE_RATE_API_SKILL = `# Exchange Rate API – HTTP usage for agents

Base URL: BASE_URL

## GET /api/exchange-rate – Fetch rates for a base currency

Query:
- base (optional): Base currency code, default USD (e.g. USD, EUR, CNY).

Example:
  GET BASE_URL/api/exchange-rate
  GET BASE_URL/api/exchange-rate?base=EUR

Response (200): JSON
  {
    "base": "USD",
    "date": "2025-01-15",
    "rates": { "CNY": 7.24, "EUR": 0.92 }
  }

cURL:
  curl -X GET "BASE_URL/api/exchange-rate?base=USD"
  curl -X GET "BASE_URL/api/exchange-rate?base=EUR"

## POST /api/exchange-rate – Convert amount between currencies

Body (JSON):
  {
    "from": "USD",
    "to": "EUR",
    "amount": 100
  }

Response (200): JSON
  {
    "from": "USD",
    "to": "EUR",
    "amount": 100,
    "result": 92,
    "rate": 0.92,
    "date": "2025-01-15"
  }

cURL:
  curl -X POST "BASE_URL/api/exchange-rate" \\
    -H "Content-Type: application/json" \\
    -d '{"from":"USD","to":"CNY","amount":100}'
`
