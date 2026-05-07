---
name: dns
description: When a user asks to resolve a hostname → return A/AAAA records (DNS lookup).
---

# DNS Query API – A / AAAA lookup (agent-ready)

## When to use

- User wants **DNS resolution** for a **hostname**: A / AAAA records, “what IP is example.com”, “resolve domain”.
- Optional **resolver** override (e.g. 1.1.1.1).
- **Do not** call for non-DNS tasks (MX dig details if not supported, internal network scans, unrelated chat).
- **Do not overuse:** unrelated intent → do not call.

## Hard boundaries (must check before call)

- This tool resolves DNS records only; do not use it for HTTP reachability, SSL chain validation, or port scanning claims.
- Input must be a hostname/domain; if user gives only a URL path/query without host, ask for host first.

## Pre-check (before tool call)

- Confirm the target is a valid hostname (or extract host from URL).
- Confirm requested output is DNS records (A/AAAA scope of this module), not web/app diagnostics.

## Fallback (when not suitable)

- If the request is about site availability/TLS/API latency, explain DNS tool is not sufficient and switch to a more suitable module/tool.
- If host cannot be parsed, ask user to provide a concrete hostname once.

## Retry policy

- Retry only on transient **5xx** or network-like failures.
- Do not retry for invalid domain input (**4xx** class or validation errors) until user provides corrected host.

## Multi-turn / Missing parameters

- **Parse first:** extract **hostname** from URLs (`https://example.com/path` → `example.com`) or plain domain.
- If **domain** is missing or invalid, **do not** call — ask once for a **fully qualified hostname** (e.g. `example.com`).

## Parameters

- `domain` (string, **required**): hostname to query.
- `dns` (string, optional): resolver IP or host; default **1.1.1.1** if omitted.

## Steps

0. **Conversation cache:** Same `GET` URL (`domain` + `dns`) already **200** in this conversation → **reuse** `data`; skip call.
1. **Normalize** domain (strip scheme/path if user pasted a URL).
2. **Call** `GET /api/dns?domain=...` (add `&dns=...` if user specified resolver).
3. **Check HTTP status** and envelope `{ code, message, data }`.
4. **Extract** `data.records`, `data.domain`, `data.dns`.
5. **Format** concise list of record **type** + **data** (and TTL if useful).

## Request

Same query string ⇒ cacheable:

`GET /api/dns?domain=example.com`
`GET /api/dns?domain=example.com&dns=1.1.1.1`

## Response

Standard envelope `{ code, message, data }`.

- **200** — `data.records`: array of `{ name, type, ttl, data }` (shape as returned).
- **400** — missing/invalid `domain` → fix input, **do not retry** same bad value.

## Say to the user (one line)

- List A/AAAA answers clearly; mention resolver if non-default.

## Output language

- Keep **record data** literal; explain in the **user’s language**.

## Idempotency & cache (conversation)

- Step 0: identical GET URL → reuse prior success.

## Examples

- User: “IP of example.com” → `GET /api/dns?domain=example.com` → summarize A/AAAA from `data.records`.
- User: “Resolve google.com via 8.8.8.8” → add `dns=8.8.8.8`.
- User: “Convert 100 USD to EUR” → **Do not call this API**.

## Agent rules

Always **GET**; follow **Steps**.

## Error handling (HTTP)

- **400:** Ask for a valid domain; no blind retry.
- **5xx:** Suggest retry later.
