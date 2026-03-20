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

Standard envelope `{ code, message, data }`.

- **200** — `data` includes e.g. `isHoliday` (boolean), `name` (string, may be empty when not a named holiday).

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

- Non-200: report failure briefly; **retry later** only if **5xx**; **do not** retry spam on **4xx**.
