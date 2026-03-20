---
name: movies
description: When a user asks for the latest cached movie list → return merged movie catalog.
---

# Movies API – Latest merged list (cache; agent-ready)

## When to use

- User wants **current movie listings** (Maoyan + TMDB merged cache), “what’s playing”, “top movies”, “movie list from this site”.
- This endpoint **does not** live-fetch TMDB/Maoyan per request — safe to call when a **cached list** is enough.
- **Do not** call for plot-only questions that need a different tool, or unrelated domains.
- **Do not overuse:** unrelated chat → do not call.

## Multi-turn / Missing parameters

- **No query or body** required for `GET /api/movies`. If the user wants **one specific title** not in the list, answer from the returned list or say it is not in the cached set — **do not** invent movies.

## Parameters

- None for `GET /api/movies`.

## Steps

0. **Conversation cache:** If `GET /api/movies` already returned **200** in this conversation and the user asks again without needing fresher data, **reuse** `data`.
1. **Call** `GET /api/movies`.
2. **Check HTTP status** and envelope `{ code, message, data }`.
3. **Extract** `data.movies`, `data.cachedAt` (ms timestamp when cache updated).
4. **Format** a compact list or top N titles with scores/sources as the user asked.

## Request

`GET /api/movies` — read-only; **does not** trigger upstream writes.

## Response

- **200** — `data.movies`: array of merged movie objects (fields such as `name`, `score`, `sources`, posters, URLs — see live response).
- **Empty or partial providers:** API may fall back to one source; `sources` / fields may vary.

## Say to the user (one line)

- Summarize a few titles or filter by user criteria from **returned** items only.

## Output language

- **User’s language** for commentary; keep **titles** as returned.

## Idempotency & cache (conversation)

- Reuse prior **200** body in the same conversation when appropriate.

## Examples

- User: “List trending movies from the API” → GET `/api/movies` → summarize `data.movies` (verify live).
- User: “Top 5 by score” → same GET → sort/filter **client-side** from `data.movies`.
- User: “What’s the CNY rate?” → **Do not call this API**.

## Agent rules

Single **GET**; follow **Steps**; do not call external TMDB/Maoyan if this list suffices.

## Error handling (HTTP)

- Non-200: report briefly; **5xx** → retry later.
