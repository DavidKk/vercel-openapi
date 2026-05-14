---
name: holiday
description: When a user asks whether today is a public holiday in mainland China → return holiday status/name.
---

# Holiday API – Today’s holiday status (China; agent-ready)

## When to use

- User asks whether **today** is a **public holiday** in **mainland China**, or the **holiday name** for today (any language, e.g. “is today a public holiday?”).
- Same intent in various languages → still trigger.
- **Do not** call for **other dates** unless a separate dated endpoint exists in the product spec (this route is **today-only**).
- **Do not overuse:** unrelated intent (FX, DNS, movies, etc.) → do not call.

## Hard boundaries (must check before call)

- This module is **mainland China holiday semantics**. If user asks for another country/region holiday calendar, **do not call** this endpoint.
- This route is **today-only**; for historical/future dates, do not fake support on this path.

## Pre-check (before tool call)

- Confirm user intent is "today holiday status" for mainland China.
- Confirm request does not require historical/future date computation on this endpoint.

## Fallback (when not suitable)

- If user asks for another country, explain region limitation and avoid calling this tool.
- If user asks for non-today date, explain "today-only" and suggest alternative source/module if available.

## Retry policy

- Retry only on transient **500/5xx** once.
- Do not retry **4xx** or unsupported-date requests without changed input/route.

## Multi-turn / Missing parameters

- **No required parameters** for `GET /api/holiday`. If the user asks about **another day**, explain this API is **today-only** and do not invent a date parameter for this path.

## Parameters

- None for `GET /api/holiday`.

## Steps

0. **Conversation cache:** If `GET /api/holiday` already succeeded in this conversation and the user repeats the same question, **reuse** the last `data` (still “today” in the same session).
1. **Call** `GET /api/holiday`.
2. **Check HTTP status** and envelope `{ code, message, data }`.
3. **Extract** `data.isHoliday`, `data.name` (or fields as returned).
4. **Format** one short answer for the user.

## Request

`GET /api/holiday` — read-only, latest **today** status per API semantics.

## Response

**Envelope:** HTTP **200** with `{ code: 0, message: "ok", data: { … } }` (standard success shape).

- **`data.isHoliday`** (boolean) — whether today is treated as a public holiday for this service.
- **`data.name`** (string) — holiday or special-day **name**; may be **empty** when there is no named entry (still a valid **200**).

Trust **HTTP status** first, then read **`data`** for fields above.

## Say to the user (one line)

- e.g. “Today is / is not a public holiday” + `name` if present and relevant.

## Output language

- Keep official holiday **name** from `data` verbatim when the API returns localized labels.

## Idempotency & cache (conversation)

- Reuse successful **GET /api/holiday** result in the same conversation for repeated “today?” questions.

## Examples

- User: “Is today an official public holiday?” → GET `/api/holiday` → answer from `data`.
- User: “Is tomorrow a holiday?” → **Do not use this endpoint** for “tomorrow”; say the API is **today-only** and offer general guidance or another data source if available.
- User: “DNS for example.com” → **Do not call this API**.

## Agent rules

Single GET; no body; follow **Steps**.

## Error handling (HTTP)

| Status  | Agent behavior                                                                                |
| ------- | --------------------------------------------------------------------------------------------- |
| **200** | Success — use `data.isHoliday` / `data.name` even if `name` is empty.                         |
| **500** | Server-side error — report briefly; **one** retry later is acceptable; **do not** loop.       |
| **4xx** | Unusual for this GET — if seen, **do not** blind retry; relay `message` from JSON if present. |
