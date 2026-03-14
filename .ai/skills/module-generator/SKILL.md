---
name: module-generator
description: Scaffolds or extends feature modules in this Next.js app using the project generator when possible; otherwise follows .ai/rules and .ai/schemas to implement by hand. Use when the user wants to add a new module, create a new feature module, scaffold module layout/pages, or implement overview component / API route / MCP tools / Playground for a module.
---

# Module generator skill

When adding or extending a **feature module** (e.g. holiday, fuel-price, exchange-rate, geo) in this repo, prefer the **generator** for the fixed shell; use **descriptions and .ai/rules** for the rest.

---

## Development workflow (mandatory)

**Before** creating schema or code for a new module, follow the **module development workflow** in order. Do not skip to “generate module” until the previous phase has a clear, confirmed outcome.

| Phase | Name                      | What to do                                                                                       | Done when                                   |
| ----- | ------------------------- | ------------------------------------------------------------------------------------------------ | ------------------------------------------- |
| 1     | Requirements confirmation | Confirm scope & success criteria; present short summary back to developer                        | Summary **confirmed** by developer          |
| 2     | Customize requirements    | Agree API (paths, shapes), Overview (or empty), MCP (tools, params); confirm list with developer | Concrete list **confirmed**                 |
| 3     | Requirements breakdown    | Write implementation checklist; list open questions; raise conflicts with rules/specs            | Checklist complete; no unresolved blockers  |
| 4     | Generate module           | Schema → generator → implement → add tests → run `pnpm ok`                                       | Module works; tests added; `pnpm ok` passes |
| 5     | Raise issues              | When blocked or ambiguous: stop, state issue, ask developer, wait, then resume                   | Developer answered; resume from same step   |

**Full steps (actions, deliverables, completion criteria, when to escalate):** `.ai/workflow/module-development.md`

When the user says “add a module” or “generate a module”, **start with Phase 1**. Present a short summary for confirmation before Phase 2; get a concrete API/Overview/MCP list confirmed before Phase 3; produce the checklist before Phase 4. Use Phase 5 whenever you would otherwise have to guess.

---

## 1. Use the generator (preferred when applicable)

The generator produces the **module shell** from a schema so layout and pages stay consistent and token use stays low.

### What the generator produces

- `app/<id>/layout.tsx` – sidebar + main area (from `.ai/rules/module-layout.yaml`)
- `app/<id>/page.tsx` – overview page placeholder (single section; content not from schema)
- `app/<id>/api/page.tsx` – doc + playground two-column page
- `app/<id>/mcp/page.tsx` – MCP doc + playground two-column page

### How to use it

1. **Create or edit** `.ai/schemas/<module-id>.yaml` (e.g. `.ai/schemas/my-feature.yaml`).  
   Follow **`.ai/schemas/README.md`** and **`.ai/rules/layout/module-layout.md`**.  
   Copy an existing schema (e.g. `.ai/schemas/holiday.yaml`) and change `id`, `name`, `routePrefix`, `apiPage`, `mcpPage`, and optional `sidebarItems` (including `iconName` for the first item if needed). Do not add `overview` (Overview content is not from schema).

2. **Run the generator** (from repo root):

   ```bash
   pnpm run generate:module .ai/schemas/<module-id>.yaml
   ```

   This overwrites the four files above for that module. **Re-running the generator on an existing module overwrites its overview page** with the empty placeholder; restore or re-add the overview component by hand if needed. If the user prefers not to overwrite, generate to a temp path or show the diff first.

3. **Optional programmatic use**: The agent may call `createModuleFromSchema(schemaPath)` from `.ai/generators/skill.ts` (Node only) to get `GeneratedFile[]` and then write or show the contents. Schema path is relative to project root (e.g. `.ai/schemas/holiday.yaml`).

Do **not** hand-write the layout or the four page files when a schema already exists or can be defined; use the generator so structure and styles stay aligned with rules.

---

## 2. Use descriptions and .ai/rules (generator does not do these)

The generator does **not** create the following. Implement them by hand following the project rules.

### Overview component

- **When**: Ask the developer how the Overview should be displayed. If they do not specify, leave the overview page empty (the generator already produces an empty placeholder).
- **Where**: `app/<id>/components/` with an `index.ts` (or `index.tsx`) that re-exports.  
  See **`.ai/rules/layout/component-structure.md`** (page-private components at segment level).
- **What**: The main UI for the overview tab (e.g. calendar, table, form). Implement by hand and add it to `app/<id>/page.tsx` when the developer has specified the design. If the overview needs server data, the page can be async and fetch before rendering (see existing `app/holiday/page.tsx` or `app/fuel-price/page.tsx`).

### API route handler

- **Where**: `app/api/<id>/route.ts` (and optional dynamic segments, e.g. `app/api/fuel-price/[province]/route.ts`).
- **Semantics first:** Read **`.ai/specs/api-semantics.md`**. Public APIs are **read-only** and return **latest credit/data** only; do not add history or write behavior unless a separate spec exists and uses a distinct path.
- **Rules** (from **`.ai/rules/layout/module-layout.md`**):
  - `export const runtime = 'edge'`
  - Use the shared wrapper: `export const GET/POST = api(async (req) => { ... })`
  - Return with `jsonSuccess(...)` (and optional headers).
- Implement the actual logic (e.g. call services, read DB). Keep validation and response shape consistent with the schema's `apiPage.endpoints` and any existing patterns in `app/api/`.

### MCP tools

- **Where**: `app/api/mcp/tools/<category>/` (one file per tool or as in existing structure).  
  Register in `app/api/mcp/tools/index.ts` (or the project's MCP tool registry).
- **What**: Implement the tools listed in the schema's `mcpPage.tools`.  
  Request/response shape should match what the MCP doc and Playground expect.

### API and MCP Playground components

- **Where**:
  - API Playground: `app/<id>/api/components/` + `index.ts` re-export.
  - MCP Playground: `app/<id>/mcp/components/` + `index.ts` re-export.  
    See **`.ai/rules/layout/component-structure.md`** (shared by children → parent segment's `components/`).
- **What**: Client components that call `/api/<id>` or `POST /api/mcp` and display results.  
  Naming and import paths must match the schema (`apiPage.playgroundComponentName` / `playgroundImportPath` and `mcpPage.*`).

### Global Nav entry

- **Where**: `app/Nav/index.tsx` – add the new module to the `NAV_ITEMS` array (or equivalent).
- **What**: `href: '/<id>'`, `title`, and the same icon style as other items (e.g. from `react-icons/tb`).  
  Keep the same structure as existing entries.

### Function Calling and Skill pages (optional)

- **Where**: `app/<id>/function-calling/page.tsx`, `app/<id>/skill/page.tsx`.  
  Not produced by the generator; add if the module needs these tabs.  
  Reuse the same doc + playground or content pattern as in other modules (see holiday, fuel-price, exchange-rate, geo).

---

## 3. End-to-end flow for a new module

1. **Schema**: Add `.ai/schemas/<new-module>.yaml` (see `.ai/schemas/README.md` and existing YAMLs).
2. **Generator**: Run `pnpm run generate:module .ai/schemas/<new-module>.yaml` (or call `createModuleFromSchema` and write the four files).
3. **Overview**: Ask the developer how the Overview should be displayed. If not specified, leave empty. Otherwise implement `app/<new-module>/components/<OverviewComponent>.tsx`, re-export from `app/<new-module>/components/index.ts`, and use it in `app/<new-module>/page.tsx` (e.g. make page async and pass props if server data is needed).
4. **API**: Implement `app/api/<new-module>/route.ts` (and any nested routes) with `api()`, `jsonSuccess`, and `runtime = 'edge'`.
5. **Playgrounds**: Implement API and MCP playground components under `app/<new-module>/api/components/` and `app/<new-module>/mcp/components/` and re-export.
6. **MCP**: Implement tools under `app/api/mcp/tools/` and register them.
7. **Nav**: Add the module to `app/Nav/index.tsx` (e.g. `NAV_ITEMS`).
8. **Optional**: Add `function-calling/page.tsx` and `skill/page.tsx` plus content if needed.
9. **Tests**: Add test cases for new code. Unit tests: `__tests__/**/*.spec.ts` (mirror source structure); naming: `should [expected behavior] [conditions]` (see `.cursorrules`). E2E: `__webtests__/` or Playwright as needed. Cover API routes, services, and non-trivial components.
10. **Quality gate**: Run **`pnpm ok`** (format, lint, typecheck, test, test:e2e). Fix any failure until `pnpm ok` passes before considering the module done.

Whenever a step can be driven by the generator (step 2), use it; for the rest, follow **`.ai/rules`** and **`.ai/schemas/README.md`** and implement by description. Do not skip tests or the quality gate (step 9–10).
