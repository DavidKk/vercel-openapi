/**
 * API skill document for agents: how to call DNS Query HTTP API.
 * Use BASE_URL as placeholder; replaced with current origin when copying/downloading.
 * GET is cacheable (L0) by URL.
 */
export const DNS_API_SKILL = `# DNS Query API – HTTP usage for agents

Base URL: BASE_URL

## GET /api/dns – Query DNS (cacheable)

Query: domain (required), dns (optional, default 1.1.1.1). Returns A and AAAA records in one response.
Same params ⇒ same URL ⇒ browser and CDN cache (L0).

  GET BASE_URL/api/dns?domain=example.com
  GET BASE_URL/api/dns?domain=example.com&dns=1.1.1.1

Response (200): JSON (wrapped in standard envelope: code, message, data)
  data: { "records": [ { "name", "type", "ttl", "data" }, ... ], "domain": "example.com", "dns": "1.1.1.1" }

Errors: 400 invalid or missing domain.

cURL:
  curl "BASE_URL/api/dns?domain=example.com"
`
