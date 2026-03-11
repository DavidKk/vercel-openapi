# Fuel Price API – HTTP usage for agents

Base URL: http://localhost:3000

## GET /api/fuel-price – All provinces

Returns current/previous fuel prices for all provinces.

GET http://localhost:3000/api/fuel-price

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
curl -X GET "http://localhost:3000/api/fuel-price"

## GET /api/fuel-price/:province – Single province

Path param: province (e.g. 北京, Beijing). Same response shape with one province in current/previous.

GET http://localhost:3000/api/fuel-price/北京

cURL:
curl -X GET "http://localhost:3000/api/fuel-price/北京"

## GET /api/fuel-price/:province/promo – Recharge promotion

Path: province. Query: fuelType (b92|b95|b98|b0, default b92), amount (required), bonus (required).

GET http://localhost:3000/api/fuel-price/北京/promo?fuelType=b92&amount=500&bonus=50

cURL:
curl -X GET "http://localhost:3000/api/fuel-price/北京/promo?fuelType=b92&amount=500&bonus=50"
