/**
 * API skill document for agents: how to call Finance (TASI) HTTP API.
 * Use BASE_URL as placeholder; replaced with current origin when copying/downloading.
 */
export const TASI_API_SKILL = `# Finance API – HTTP usage for agents (currently TASI)

Base URL: BASE_URL

## GET /api/finance/tasi/company/daily – Company daily (today, single date, or company K-line)

Query:
- (none): Today, all companies (from TASI feed).
- date (optional): YYYY-MM-DD for that day (from Turso).
- code + from + to (optional): Company K-line; code = company code, from/to = YYYY-MM-DD (from Turso).

Example:
  GET BASE_URL/api/finance/tasi/company/daily
  GET BASE_URL/api/finance/tasi/company/daily?date=2025-03-01
  GET BASE_URL/api/finance/tasi/company/daily?code=1120&from=2025-01-01&to=2025-03-01

Response (200): JSON array of company daily records (code, name, date, open, high, low, lastPrice, volume, …).

cURL:
  curl -X GET "BASE_URL/api/finance/tasi/company/daily"
  curl -X GET "BASE_URL/api/finance/tasi/company/daily?date=2025-03-01"

## GET /api/finance/tasi/summary/daily – Market summary (today, single date, or K-line)

Query:
- (none): Today (from TASI feed).
- date (optional): YYYY-MM-DD for that day (from Turso).
- from + to (optional): Market K-line; from/to = YYYY-MM-DD (from Turso).

Example:
  GET BASE_URL/api/finance/tasi/summary/daily
  GET BASE_URL/api/finance/tasi/summary/daily?date=2025-03-01
  GET BASE_URL/api/finance/tasi/summary/daily?from=2025-01-01&to=2025-03-01

Response (200): JSON object (single date) or array (K-line): date, open, high, low, close, volumeTraded, valueTraded, …

cURL:
  curl -X GET "BASE_URL/api/finance/tasi/summary/daily"
  curl -X GET "BASE_URL/api/finance/tasi/summary/daily?from=2025-01-01&to=2025-03-01"
`
