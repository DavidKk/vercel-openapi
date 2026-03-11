# Exchange Rate API – HTTP usage for agents

Base URL: http://localhost:3000

## GET /api/exchange-rate – Fetch rates for a base currency

Query:

- base (optional): Base currency code, default USD (e.g. USD, EUR, CNY).

Example:
GET http://localhost:3000/api/exchange-rate
GET http://localhost:3000/api/exchange-rate?base=EUR

Response (200): JSON
{
"base": "USD",
"date": "2025-01-15",
"rates": { "CNY": 7.24, "EUR": 0.92 }
}

cURL:
curl -X GET "http://localhost:3000/api/exchange-rate?base=USD"
curl -X GET "http://localhost:3000/api/exchange-rate?base=EUR"

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
curl -X POST "http://localhost:3000/api/exchange-rate" \
 -H "Content-Type: application/json" \
 -d '{"from":"USD","to":"CNY","amount":100}'
