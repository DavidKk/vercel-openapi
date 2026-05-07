---
name: proxy-rule
description: When a user wants Clash RULE-SET lines filtered by action type → return merged payloadText.
---

# Proxy rule API – Clash RULE-SET merge (agent-ready)

## When to use

- User wants **merged Clash RULE-SET line prefixes** filtered by **rule action type** (`Proxy`, `DIRECT`, `REJECT`, case-insensitive) for copy/paste into Clash.
- Prefer `data.payloadText` (newline-joined) for paste.
- **Do not** call for unrelated proxy setup without `type`, or for non-Clash formats unless documented.
- **Do not overuse:** unrelated intent → do not call.

## Hard boundaries (must check before call)

- Default to **public** route `GET /api/proxy-rule/clash/config`; this is the only safe path for normal agent usage.
- **Do not call admin routes** (`/api/proxy-rule/admin/clash`) unless a valid authenticated session is already established for this request context.

## Pre-check (before tool call)

- Confirm `type` is provided and meaningful for Clash action filtering.
- Confirm whether user intent is read-only payload retrieval vs admin mutation.

## Fallback (when not suitable)

- If `type` is missing, ask for `Proxy` / `DIRECT` / `REJECT` once before call.
- If admin auth/session is unavailable, stay on public route and explain write limitation.

## Retry policy

- Retry only for transient **5xx** failures.
- Do not retry unchanged missing-parameter/auth failures (**400/401/403**).

## Multi-turn / Missing parameters

- `type` query is **required** for `/api/proxy-rule/clash/config`. If missing, ask once: “Which Clash action type? (e.g. Proxy, DIRECT, REJECT)”.

## Parameters

- `type` (string, **required**): Clash rule action to filter.

## Steps

0. **Conversation cache:** Same `GET ...?type=...` already **200** → **reuse** `data`.
1. **Normalize** `type` (trim; case as API expects).
2. **Call** `GET /api/proxy-rule/clash/config?type=...`.
3. **Check HTTP status** and envelope `{ code, message, data }`.
4. **Extract** `data.payload` (string[]) and/or `data.payloadText` (string).
5. **Return** `payloadText` to user for copy/paste when appropriate.

## Request (public)

`GET /api/proxy-rule/clash/config?type=Proxy`

## Response

- **200** — `data.payload`, `data.payloadText` as documented.

## Admin routes (session cookie; not for typical agents)

- `GET /api/proxy-rule/admin/clash` and `POST /api/proxy-rule/admin/clash` require **HttpOnly session** after web login — **do not** document as generic agent tools unless the agent has that session.
- Body for POST: `{ "rules": [ ... ] }` per server contract.

## Say to the user (one line)

- Provide `payloadText` or a short line count + first lines if huge.

## Output language

- **User’s language** for instructions; keep **rule lines** verbatim.

## Idempotency & cache (conversation)

- Reuse same `type` GET result in the same conversation.

## Examples

- User: “Give me Proxy RULE-SET lines for Clash” → `GET /api/proxy-rule/clash/config?type=Proxy` → return `data.payloadText`.
- User: “Merge config” without type → **ask for `type`**; do not call without it.
- User: “Convert 100 USD” → **Do not call this API**.

## Agent rules

Default to **public GET** only; follow **Steps**.

## Error handling (HTTP)

- **400** missing `type`: ask user; **no** blind retry.
- **5xx:** retry later.
