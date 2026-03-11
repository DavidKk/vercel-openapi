/**
 * API skill document for agents: how to call Fuel Price HTTP API.
 * Use BASE_URL as placeholder; replaced with current origin when copying/downloading.
 */
export const FUEL_PRICE_API_SKILL = `# Fuel Price API – HTTP usage for agents

Base URL: BASE_URL

## GET /api/fuel-price – All provinces

Returns current/previous fuel prices for all provinces.

  GET BASE_URL/api/fuel-price

Response (200): JSON
  {
    "current": [
      { "province": "Beijing", "b92": 8.12, "b95": 8.71, "b98": 9.39, "b0": 7.34 }
    ],
    "previous": [],
    "latestUpdated": 1700000000000,
    "previousUpdated": 0
  }

cURL:
  curl -X GET "BASE_URL/api/fuel-price"

## GET /api/fuel-price/:province – Single province

Path param: province (e.g. 北京, Beijing). Same response shape with one province in current/previous.

  GET BASE_URL/api/fuel-price/北京

cURL:
  curl -X GET "BASE_URL/api/fuel-price/北京"

## GET /api/fuel-price/:province/promo – Recharge promotion

Path: province. Query: fuelType (b92|b95|b98|b0, default b92), amount (required), bonus (required).

  GET BASE_URL/api/fuel-price/北京/promo?fuelType=b92&amount=500&bonus=50

cURL:
  curl -X GET "BASE_URL/api/fuel-price/北京/promo?fuelType=b92&amount=500&bonus=50"
`
