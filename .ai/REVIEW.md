# .ai documentation and code review

Summary of the review and fixes applied. Use this to keep docs and code aligned and to avoid terminology drift.

---

## Issues found and fixed

### 1. Duplicate and broken references

- **README.md** had two rows for `workflow/` in the Dirs table; merged into one.
- **README.md** referred to `.ai/docs-review.md` for doc consistency; that file did not exist. Replaced with: keep module list in sync (specs/README, context/summary, glossary) and use glossary terms consistently.

### 2. Module list inconsistency

- **context/summary.md** listed only holiday, fuel price, exchange rate, geo, movies. Updated to include weather, dns, finance and to match specs (module ids: holiday, fuel-price, exchange-rate, geo, movies, weather, dns, finance).
- **specs/README.md** did not list Finance. Added Finance with a note "No spec yet; see .ai/schemas/finance.yaml and app/api/finance/."
- **specs/api-semantics.md** listed "china-geo" in the per-module sentence; the module **id** everywhere is `geo`. Fixed to "geo" and added weather, dns, finance to the list.
- **api-semantics.md** Public API list now includes `/api/weather`, `/api/dns`, `/api/finance/...` for consistency.

### 3. Wrong path in specs

- **api-semantics.md** said "See initializer/cache-control.ts" for `CACHE_CONTROL_LONG_LIVED`. The correct path is `initializer/response/cache-control.ts` and the code imports from `@/initializer/response`. Updated to: "Import from `@/initializer/response` (re-exports from initializer/response/cache-control.ts)."

### 4. Terminology and ambiguity (knowledge base)

- **Overview:** Was not defined in the glossary. In module context "Overview" means the first sidebar entry and the main view at `/<module>`. Added a glossary entry **Overview (module)** and stated that Overview content is not from schema.
- **Skill:** Two different meanings used in the repo: (1) the fifth module sidebar tab (Skill page with ApiSkillPanel); (2) an AI skill document (`.ai/skills/<name>/SKILL.md`). Glossary had only the second. Added **Function Calling / Skill (disambiguation)** with: Function Calling (fourth tab), Skill (module tab) = fifth tab, Skill (AI skill) = SKILL.md.
- **Schema:** "Schema" can mean module schema (YAML), API response shape, or TypeScript types. Added **Schema (module) / module schema** so "module schema" is the single term for `.ai/schemas/<id>.yaml`.
- **Module id:** Specs README now states that the module **id** in specs and schema is the route name (e.g. `geo`, not `china-geo`). Glossary Module entry now says the same.
- **Public API:** Glossary list was missing finance, weather, dns. Updated and added a note to use "Public API" consistently (not mix with "REST API" for the same endpoints).
- **Generator:** Added **Generator (module generator)** so "generator" in this repo means the module shell generator (createModuleFromSchema / pnpm run generate:module), not a generic code generator.

### 5. Rules vs code

- **module-layout.md** listed allowed sidebar icon names but omitted `TbMovie`, `TbWorld`, `TbCloudRain` used by movies, dns, and weather schemas. Added these to the allowed list.

---

## Terminology quick reference (for AI)

| Term              | Single meaning in this repo                                                                                            |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------- |
| **Module**        | Feature area with route prefix, 5 sidebar entries, optional module schema. Module **id** = route segment (e.g. `geo`). |
| **Overview**      | First sidebar entry; main view at `/<module>`. Content not from schema.                                                |
| **Module schema** | `.ai/schemas/<id>.yaml` for the generator.                                                                             |
| **Generator**     | Module shell generator: `pnpm run generate:module .ai/schemas/<id>.yaml`.                                              |
| **Skill (tab)**   | Fifth sidebar page: `/<module>/skill`.                                                                                 |
| **Skill (AI)**    | `.ai/skills/<name>/SKILL.md` capability doc.                                                                           |
| **Public API**    | Read-only endpoints under `/api/<module>/...`.                                                                         |

---

## Files to keep in sync

- **Module list:** `.ai/specs/README.md`, `.ai/context/summary.md`, and any "full list" in api-semantics or glossary. When adding a module, update all.
- **Paths:** API handler pattern and response helpers: `initializer/controller.ts` (api, cron), `initializer/response` (jsonSuccess, cache-control). Docs should reference `@/initializer/response` and `@/initializer/controller` or the actual paths under `initializer/`.
- **Allowed icons:** `.ai/rules/layout/module-layout.md` vs icons used in `app/<module>/layout.tsx` and schemas. When adding a new icon, update the rule.

---

## Optional follow-ups

- Add a short **specs/modules/finance.md** when the Finance API is stabilized, and link it from specs/README.
- If more modules are added, consider a single **modules list** file that other docs include or reference to avoid drift.
