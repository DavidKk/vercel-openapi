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
- **Inner container (two columns):** `<div className="flex min-h-0 flex-1 overflow-hidden">`
- **Main content (right):** `<main className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden">`
- **Sidebar + content:** Left = `DashboardSidebar`; right = `main` renders the current route's `children`. Do not change the above classNames or structure; only configure the items passed to `DashboardSidebar`.

---

## Sidebar structure

Exactly **5 entries** in this order; only `title` / `ariaLabel` / `iconName` may be overridden per module:

1. **Overview / Calendar** — Route: `/<module>`. Main view (e.g. calendar, table, converter).
2. **API** — Route: `/<module>/api`. REST API doc + Playground.
3. **MCP tools** — Route: `/<module>/mcp`. MCP tools doc + Playground for this module.
4. **Function Calling** — Route: `/<module>/function-calling`. Function-calling examples and UI.
5. **Skill** — Route: `/<module>/skill`. Skill definition, install instructions, examples.

Constraint: Generator and AI may only supply `title` / `ariaLabel` / `iconName` in the schema; do not add, remove, or reorder entries.

---

## Function Calling and Skill page patterns

All feature modules must implement real pages for **Function Calling** and **Skill** so that all 5 sidebar items resolve to content:

- **Function Calling page**
  - Path: `app/<module>/function-calling/page.tsx`.
  - Use the shared `FunctionCallingPanel` (`@/components/FunctionCallingPanel`).
  - Export a default page component named `<ModuleName>FunctionCallingPage`.
  - Parameters:
    - `title`: usually `"Function Calling"`.
    - `subtitle`: short description of which tools for this module are exposed as OpenAI-compatible functions (list key tool names).
    - `defaultToolsCategory`: module id (e.g. `"holiday"`, `"exchange-rate"`, `"weather"`).
- **Skill page**
  - Path: `app/<module>/skill/page.tsx`.
  - Use the shared `ApiSkillPanel` (`@/components/ApiSkillPanel`).
  - Export a default page component named `<ModuleName>SkillPage`.
  - Import a `<MODULE>_API_SKILL` constant from a local `skill-content` source and pass it as `content`.
  - Set `downloadFilename` to `moduleSkillMarkdownFilename('<module>')` from `@/app/api/mcp/skillNaming` (e.g. `unbnd-holiday-skill.md`); pass `fill` to use full-height layout.

New modules should copy these patterns from existing implementations (e.g. holiday, fuel-price, exchange-rate) and adapt only the text and skill content.

---

## Icons and styling

- Sidebar entries use `react-icons/tb` icons with `className="h-5 w-5"`.
- Allowed icon names (extend in rules when needed): `TbCalendarSearch`, `TbGasStation`, `TbCurrencyDollar`, `TbMapPin`, `TbApi`, `TbRobot`, `TbCode`, `TbFileText`, `TbMovie`, `TbWorld`, `TbCloudRain`. Use only `react-icons/tb`. Do not introduce new icon sets without updating this rule.

---

## Overview page

- Path: `app/<module>/page.tsx`.
- Export: `export default function <ModuleName>Page() { ... }`.
- DOM: Outer `<section className="flex h-full flex-col">`; inside, the main view component (or leave empty until the developer specifies).
- **Content is not from schema.** Overview content is module-specific (calendar, table, form, etc.). When developing a new module, ask the developer how the Overview should be displayed; if they do not specify, leave the section empty. Do not add header/sidebar; that is handled by the shell and layout.

---

## API / MCP doc + Playground layout

Two-column layout: left = documentation, right = Playground. **On mobile, the two columns are horizontally scrollable** (left/right swipe); on `md` and up they sit side-by-side.

- Outer: `flex h-full flex-nowrap overflow-x-auto overscroll-x-contain md:overflow-visible` so mobile can scroll horizontally.
- **Left (doc):** `section` with `className="flex h-full min-h-0 flex-shrink-0 w-[85vw] min-w-[280px] flex-col border-r border-gray-200 bg-white md:w-1/2 md:min-w-[320px] md:flex-1"`. Use `DocPanelHeader` with `title` and `subtitle`. Content area: `className="min-h-0 flex-1 overflow-y-auto px-3 py-2 text-[11px] text-gray-800"`. Use constants from `app/Nav/constants.ts`: `DOC_SECTION_TITLE_CLASS`, `DOC_ENDPOINT_BOX_CLASS`, `DOC_ENDPOINT_DESC_CLASS`. REST API page: document `/api/<module>...` endpoints. MCP page: document **`GET` / `POST` `/api/mcp/<module>`** (or **`/api/mcp`** when the playground targets the aggregate server, e.g. geo), list tools, and place **`McpOneClickInstallBar`** from `@/components/McpOneClickInstallBar` as the **first child** inside the scrollable doc area with **`endpointPath="/api/mcp/<module>"`** (or `/api/mcp` for aggregate) and `className="mb-3"`.
- **Right (Playground):** `section` with `className="flex h-full min-h-0 flex-shrink-0 w-[85vw] min-w-[280px] flex-col bg-gray-50 md:w-1/2 md:min-w-[320px] md:flex-1"`. Render the module's Playground component (e.g. `HolidayApiPlayground`, `HolidayMcpPlayground`).
- **Shared component:** For Function Calling, use `DocPlaygroundLayout` from `@/components/DocPlaygroundLayout` with `doc` and `playground` props to get the same mobile scroll behavior.

Constraint: Do not add a third column or change the left/right layout.

---

## API handler pattern (backend)

- Route: `app/api/<module>/route.ts` (or nested, e.g. `app/api/<module>/<sub>/route.ts`).
- Use: `export const runtime = 'edge'`; `export const GET/POST = api(async (req) => { ... })`; return with `jsonSuccess(...)` and headers.
- Semantics: **Anonymous** public API use is **read-only** and returns **latest credit/data** unless excepted. Session-guarded writes or history: see `.ai/specs/api-semantics.md` and the module spec (e.g. prices, finance).

Constraint: New module REST endpoints must follow the above pattern and semantics for consistent caching and response shape.
