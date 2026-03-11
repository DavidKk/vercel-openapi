/**
 * API skill document for agents: how to call Holiday HTTP API.
 * Use BASE_URL as placeholder; replaced with current origin when copying/downloading.
 */
export const HOLIDAY_API_SKILL = `# Holiday API – HTTP usage for agents

Base URL: BASE_URL

## GET /api/holiday – Today's holiday status

Returns whether today is a holiday (mainland China calendar) and the holiday name.

  GET BASE_URL/api/holiday

Response (200): JSON
  {
    "isHoliday": true,
    "name": "National Day"
  }

cURL:
  curl -X GET "BASE_URL/api/holiday"
`
