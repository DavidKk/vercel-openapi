# Module layout rules

Single source for layout, sidebar, and page structure for all modules (Holiday, Fuel Price, Exchange Rate, Geolocation, Movies, and future modules). Both humans and AI must follow this; the generator also complies.

---

## Global shell

- **Header**
  - Use the global `Nav` component, fixed at the top. No per-module header.
- **Body**
  - `body` uses Tailwind: `antialiased h-screen flex flex-col overflow-hidden`.
  - Content area is a flexible `flex-1` container for each module's layout.
- **Footer**
  - Global `NotificationStack` is fixed at the bottom. Module code must not remove or replace it.

---

## Module layout (DOM structure)

Every module layout must use this structure:

- **Outer container:** `<div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-gray-100">`
- **Inner container (mobile: bar + main; md+: sidebar + main):** `<div className="flex min-h-0 flex-1 flex-col overflow-hidden md:flex-row">`
- **Main content (right):** `<main className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden">`
- **Sidebar + content:** Left = `DashboardSidebar`; right = `main` renders the current route's `children`. Do not change the above classNames or structure; only configure the items passed to `DashboardSidebar`.

---

## Sidebar structure

Exactly **3 core entries** in this order (plus optional manage when authenticated); only `title` / `ariaLabel` / `iconName` may be overridden per module:

1. **Overview / Calendar** — Route: `/<module>`. Main view (e.g. calendar, table, converter).
2. **API** — Route: `/<module>/api`. REST OpenAPI doc + Playground.
3. **MCP tools** — Route: `/<module>/mcp`. MCP tools doc + Playground for this module.

Constraint: Generator and AI may only supply `title` / `ariaLabel` / `iconName` in the schema; do not add Function Calling or Skill sidebar tabs (removed from product surface; MCP may still serve skill markdown as resources).

---

## Icons and styling

- Sidebar entries use `react-icons/tb` icons with `className="h-5 w-5"`.
- Allowed icon names (extend in rules when needed): `TbCalendarSearch`, `TbGasStation`, `TbCurrencyDollar`, `TbMapPin`, `TbApi`, `TbRobot`, `TbCode`, `TbFileText`, `TbBook`, `TbMovie`, `TbCloudRain`, `TbRoute2`, `TbServer2`, `TbWallet`, `TbChartLine`, `TbCoin`. Use only `react-icons/tb` (module-specific icons may use `react-icons/md` when documented, e.g. `MdPriceCheck` for china-prices). Do not introduce new icon sets without updating this rule.

---

## Overview page

- Path: `app/<module>/page.tsx`.
- Export: `export default function <ModuleName>Page() { ... }`.
- DOM: Outer `<section className="flex h-full flex-col">`; inside, the main view component (or leave empty until the developer specifies).
- **Content is not from schema.** Overview content is module-specific (calendar, table, form, etc.). When developing a new module, ask the developer how the Overview should be displayed; if they do not specify, leave the section empty. Do not add header/sidebar; that is handled by the shell and layout.

---

## Content spacing tokens

All page chrome padding must use tokens from `app/Nav/constants.ts` — do **not** invent ad-hoc `px-*` / `py-*` on headers, doc bodies, playground sections, or overview scroll areas.

| Token                      | Classes     | Use for                                             |
| -------------------------- | ----------- | --------------------------------------------------- |
| `CONTENT_INSET_X_CLASS`    | `px-4`      | Horizontal page inset only                          |
| `CONTENT_INSET_Y_CLASS`    | `py-2`      | Compact vertical — ContentPageHeader title row only |
| `CONTENT_INSET_Y_LG_CLASS` | `py-4`      | Same vertical as content pad (for composing)        |
| `CONTENT_PAD_CLASS`        | `p-4`       | Default content pad — **equal** L/R and T/B         |
| `CONTENT_PAD_NESTED_CLASS` | `p-2`       | Nested boxes inside an already-padded parent        |
| `CONTENT_PAD_DENSE_CLASS`  | `px-3 py-2` | Dense table cells / compact list rows               |

Composites built from those tokens:

- `DOC_PANEL_BODY_CLASS` — scrollable API/MCP doc body
- `PLAYGROUND_SECTION_HEADER_CLASS` / `PLAYGROUND_SECTION_HEADER_STACKED_CLASS` / `PLAYGROUND_SECTION_BODY_CLASS` / `PLAYGROUND_RESPONSE_BODY_CLASS` — playground chrome
- `ContentPageHeader` shell/title row — uses `CONTENT_INSET_X_CLASS` + `CONTENT_INSET_Y_CLASS`

---

## API / MCP doc + Playground layout

Two-column layout: left = documentation, right = Playground. **On mobile, the two columns are horizontally scrollable** (left/right swipe); on `md` and up they sit side-by-side.

- Outer: `flex h-full flex-nowrap overflow-x-auto overscroll-x-contain md:overflow-visible` so mobile can scroll horizontally.
- **Left (doc):** `section` with `className="flex h-full min-h-0 flex-shrink-0 w-[85vw] min-w-[280px] flex-col border-r border-gray-200 bg-white md:w-1/2 md:min-w-[320px] md:flex-1"`. Use `DocPanelHeader` with `title` and `subtitle`. Content area: use `DOC_PANEL_BODY_CLASS`. Also use `DOC_SECTION_TITLE_CLASS`, `DOC_ENDPOINT_BOX_CLASS`, `DOC_ENDPOINT_DESC_CLASS`. REST API page: document `/api/<module>...` endpoints. MCP page: document **`GET` / `POST` `/api/mcp/<module>`** (or **`/api/mcp`** when the playground targets the aggregate server, e.g. geo), list tools, and place **`McpOneClickInstallBar`** from `@/components/McpOneClickInstallBar` as the **first child** inside the scrollable doc area with **`endpointPath="/api/mcp/<module>"`** (or `/api/mcp` for aggregate) and `className="mb-3"`.
- **Right (Playground):** `section` with `className="flex h-full min-h-0 flex-shrink-0 w-[85vw] min-w-[280px] flex-col bg-gray-50 md:w-1/2 md:min-w-[320px] md:flex-1"`. Render the module's Playground component (e.g. `HolidayApiPlayground`, `HolidayMcpPlayground`). Use playground section tokens above for Request/Response chrome.
- **Shared component:** For Function Calling, use `DocPlaygroundLayout` from `@/components/DocPlaygroundLayout` with `doc` and `playground` props to get the same mobile scroll behavior.

Constraint: Do not add a third column or change the left/right layout.

---

## API handler pattern (backend)

- Route: `app/api/<module>/route.ts` (or nested, e.g. `app/api/<module>/<sub>/route.ts`).
- Use: `export const runtime = 'edge'`; `export const GET/POST = api(async (req) => { ... })`; return with `jsonSuccess(...)` and headers.
- Semantics: **Anonymous** public API use is **read-only** and returns **latest credit/data** unless excepted. Session-guarded writes or history: see `.ai/specs/api-semantics.md` and the module spec (e.g. prices, finance).

Constraint: New module REST endpoints must follow the above pattern and semantics for consistent caching and response shape.
