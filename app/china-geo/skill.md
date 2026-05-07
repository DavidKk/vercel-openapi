---
name: geo
description: When a user provides China latitude/longitude → reverse geocode to province/city/district.
---

# China GEO API – Reverse geocode (China; agent-ready)

## When to use

- User wants **China admin location from coordinates**: province / city / district, “which district is this point”, “where are these coordinates”, reverse geocode in China, etc.
- Coordinates may appear in **any common textual form** — same trigger once **two numeric lat/lng values** can be extracted, e.g. `39.9 116.4`, `39.9042,116.4074`, `lat:39.9 lng:116.4`, `(39.9, 116.4)`, `latitude=39.9 longitude=116.4`.
- **Do not** call if the user gives **only** a place name or address **without** coordinates to resolve (answer from knowledge or other tools).
- **Do not overuse**: **Do not** call this API when the user’s intent is **unrelated** to **location lookup from latitude/longitude** (e.g. unrelated chit-chat, other APIs).

## Multi-turn / Missing parameters

- **Parse first**: try to extract two decimals from the user message (comma, space, labeled `lat`/`lng`, parentheses, etc.).
- If **latitude or longitude is still missing**, unclear, or not parseable as numbers:
  - **Do not** call the API or guess coordinates.
  - Ask once for **two decimal numbers**: latitude (-90..90) and longitude (-180..180), e.g. “Please send latitude and longitude as numbers (e.g. 39.9042, 116.4074).”

## Parameters

- `latitude` (number, required): **-90..90**
- `longitude` (number, required): **-180..180**
  Decimal degrees; pass parsed values through (no rounding unless asked).

## Steps

0. **Conversation cache**: If the **same** `(latitude, longitude)` (after parsing) was **already** successfully resolved in this conversation, **reuse** that result and go to **step 5** only — **do not** call the API again.
1. **Parse and validate** `latitude` and `longitude` are finite numbers in range; if not, go to **Multi-turn** (ask user).
2. **Call** `GET /api/geo?latitude=...&longitude=...` (prefer GET). Use `POST /api/geo` with JSON body only if GET is unavailable.
3. **Check HTTP status** (not only `code` in the body): interpret **200 / 400 / 404 / 503** per **Response** below.
4. **Extract** from `data` (on 200): `province`, `city`, `district` (and optional fields if needed).
5. **Format** one-line user-facing text per **Say to the user** and **Output language**.

## Request

**Prefer GET** (same query ⇒ cacheable URL):

`GET /api/geo?latitude=...&longitude=...`
Example: `GET /api/geo?latitude=39.9042&longitude=116.4074`

**POST** if GET is unavailable: `POST /api/geo` — body `{ "latitude": number, "longitude": number }`.

## Response

Standard envelope `{ code, message, data }`. Trust **HTTP status**:

- **200** — `data` has at least `province`, `city`, `district` (strings; may be empty), `latitude`, `longitude`; may include `province_id`, `city_id`, `district_id`, `polygon`.
- **400** — bad lat/lng → fix inputs, **do not retry**.
- **404** — not in supported China area → **do not retry**, tell user.
- **503** — service/config (e.g. polygon missing) → suggest **retry later**, not user fault.
- **Empty `city` / `district`**: common for **municipalities** (e.g. Beijing, Shanghai); means _not applicable_ in that hierarchy, **not** an error.

## Say to the user (one line)

- Both city and district empty → **province** only (e.g. 北京市).
- District set → **province + city + district** (e.g. 广东省 深圳市 南山区).
- District empty, city set → **province + city** (e.g. 四川省 成都市).

## Output language

- **Admin names** in the one-line summary: use the **Chinese** strings from the API (`province` / `city` / `district`) as returned.
- **Everything else** (errors, clarifying questions, disclaimers): use the **user’s language** when they are not writing in Chinese; if the user writes in Chinese, stay in Chinese.

## Idempotency & cache (conversation)

- **Step 0** is the primary rule: no duplicate calls for the same parsed pair in one conversation; **reuse** the last successful `data` for that pair.
- Call again only if the user **changes** the numbers or you never obtained a usable **200** for that pair.

## Examples

- User: `39.9042,116.4074 在哪？` → **北京市** (illustrative; follow live API `data`).
- User: `22.54,113.93` → **广东省 深圳市 南山区** (illustrative; verify with API response).
- User: `北京在哪？` → **Do not call this API** (no coordinates). Answer with general knowledge / maps context as appropriate; this tool is **only** for coordinate → admin region.

## Agent rules

Prefer GET; follow **Steps**; one short summary line as in **Say to the user** + **Output language**.

## Error handling (HTTP)

- **400**: Invalid lat/lng — fix inputs, **do not retry** with the same values.
- **404**: Outside supported China / not found — **do not retry**; explain to user.
- **503**: Service/config issue — suggest **retry later**; not the user’s fault.
