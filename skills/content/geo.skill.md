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

## Hard boundaries (must check before call)

- This module is **mainland China only**. If the user clearly asks for non-China coordinates/country, **do not call** this tool.
- If country/region is ambiguous, ask once whether the target point is in mainland China before calling.

## Pre-check (before tool call)

- Confirm two numeric coordinates are present and in valid ranges.
- Confirm target geography is mainland China or user explicitly accepts China-only coverage.

## Fallback (when not suitable)

- If user has only place name/address without coordinates, ask for lat/lng or use a dedicated geocoding source (if available) before this tool.
- If request is clearly outside China, explain this module coverage and avoid calling.

## Retry policy

- Retry only for transient **503/5xx** service failures.
- Do not retry unchanged invalid coordinates (**400**) or outside-coverage cases (**404**).

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

- Both city and district empty → **province** only (e.g. Beijing direct-controlled municipality).
- District set → **province + city + district** (e.g. Guangdong / Shenzhen / Nanshan).
- District empty, city set → **province + city** (e.g. Sichuan / Chengdu).

## Output language

- **Admin names** in the one-line summary: use `province` / `city` / `district` strings **exactly as returned** by the API (do not invent labels).
- **Everything else** (errors, clarifying questions, disclaimers): match the **user’s language**.

## Idempotency & cache (conversation)

- **Step 0** is the primary rule: no duplicate calls for the same parsed pair in one conversation; **reuse** the last successful `data` for that pair.
- Call again only if the user **changes** the numbers or you never obtained a usable **200** for that pair.

## Examples

- User: “Where is 39.9042,116.4074?” → summarize as **Beijing** (illustrative; follow live API `data`).
- User: `22.54,113.93` → **Guangdong / Shenzhen / Nanshan** (illustrative; verify with API response).
- User: “Where is Beijing?” (text only) → **Do not call this API** (no coordinates). Answer from general knowledge or another tool; this endpoint is **only** coordinate → admin region.

## Agent rules

Prefer GET; follow **Steps**; one short summary line as in **Say to the user** + **Output language**.

## Error handling (HTTP)

- **400**: Invalid lat/lng — fix inputs, **do not retry** with the same values.
- **404**: Outside supported China / not found — **do not retry**; explain to user.
- **503**: Service/config issue — suggest **retry later**; not the user’s fault.
