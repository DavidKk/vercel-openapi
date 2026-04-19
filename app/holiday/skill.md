---
name: holiday
description: When a user asks whether today is a public holiday in mainland China → return holiday status/name.
---

# Holiday API – Today’s holiday status (China; agent-ready)

## When to use

- User asks whether **today** is a **public holiday** in **mainland China**, or the **holiday name** for today, “今天放假吗”, “是不是节假日”.
- Same intent in various languages → still trigger.
- **Do not** call for **other dates** unless a separate dated endpoint exists in the product spec (this route is **today-only**).
- **Do not overuse:** unrelated intent (FX, DNS, movies, etc.) → do not call.

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

- Use the **user’s language** for the sentence; keep official holiday **name** as returned if it is Chinese text.

## Idempotency & cache (conversation)

- Reuse successful **GET /api/holiday** result in the same conversation for repeated “today?” questions.

## Examples

- User: “今天是不是法定节假日？” → GET `/api/holiday` → answer from `data`.
- User: “明天放假吗？” → **Do not use this endpoint** for “tomorrow”; say the API is **today-only** and offer general guidance or another data source if available.
- User: “DNS for example.com” → **Do not call this API**.

## Agent rules

Single GET; no body; follow **Steps**.

## Error handling (HTTP)

| Status  | Agent behavior                                                                                |
| ------- | --------------------------------------------------------------------------------------------- |
| **200** | Success — use `data.isHoliday` / `data.name` even if `name` is empty.                         |
| **500** | Server-side error — report briefly; **one** retry later is acceptable; **do not** loop.       |
| **4xx** | Unusual for this GET — if seen, **do not** blind retry; relay `message` from JSON if present. |
