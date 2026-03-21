# .ai documentation and code review

Summary of the review and fixes applied. Use this to keep docs and code aligned and to avoid terminology drift.

**AI navigation:** Prefer **`INDEX.md`** at `.ai/` root for task/topic → file lookup before reading the whole tree.

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

| Term              | Single meaning in this repo                                                                                                                              |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Module**        | Feature area with route prefix, 5 sidebar entries, optional module schema. Module **id** = route segment (e.g. `geo`).                                   |
| **Overview**      | First sidebar entry; main view at `/<module>`. Content not from schema.                                                                                  |
| **Module schema** | `.ai/schemas/<id>.yaml` for the generator.                                                                                                               |
| **Generator**     | Module shell generator: `pnpm run generate:module .ai/schemas/<id>.yaml`.                                                                                |
| **Skill (tab)**   | Fifth sidebar page: `/<module>/skill`.                                                                                                                   |
| **Skill (AI)**    | `.ai/skills/<name>/SKILL.md` capability doc.                                                                                                             |
| **Public API**    | Endpoints under `/api/<module>/...`; **anonymous** use is read-only + latest unless excepted; session **writes** where module spec allows (e.g. prices). |

---

## Files to keep in sync

- **Module list (canonical):** **`.ai/specs/modules-registry.yaml`**. Then align prose in `.ai/context/summary.md`, **`knowledge/glossary.md`**, and `.ai/specs/README.md` intro if needed. Run **`pnpm run validate:ai`** to catch drift vs `app/<id>/layout.tsx` and `.ai/schemas/*.yaml`.
- **Paths:** API handler pattern and response helpers: `initializer/controller.ts` (api, cron), `initializer/response` (jsonSuccess, cache-control). Docs should reference `@/initializer/response` and `@/initializer/controller` or the actual paths under `initializer/`.
- **Allowed icons:** `.ai/rules/layout/module-layout.md` vs icons used in `app/<module>/layout.tsx` and schemas. When adding a new icon, update the rule.

---

## Optional follow-ups

- Add **specs/modules/finance.md** when the Finance API is stabilized; set **`spec:`** in **`modules-registry.yaml`** from `null` to `modules/finance.md`.

### Prices spec reconciled with code

- **`specs/modules/prices.md`** was outdated (“no public REST”); rewritten to match **`app/api/prices/**`\*\* (read vs session write split, calc, search).
- **`api-semantics.md`**: lists `/api/prices` paths; core convention clarifies **anonymous read-only** vs **session writes**; excluded note updated.
- **`knowledge/glossary.md`**: Public API + Module examples include **prices** and anonymous vs auth wording.

---

## Requirements audit (AI workflow)

- **Added:** `.ai/workflow/requirements-audit.md` — mandatory checklist and **work-type taxonomy** (public data API, geo-scoped, example module, finance vertical, prices split, proxy-rule public vs admin, platform, docs-only, out of scope) before schema/code for new features or public API changes.
- **Updated:** `workflow/module-development.md` (audit gate before Phase 1), `workflow/README.md`, `.ai/README.md`, `rules/global.md`, `context/summary.md`, `skills/module-generator/SKILL.md`.

### Policy defaults vs approved exceptions

- **`specs/api-semantics.md`:** Short **Defaults vs exceptions**; points to **`specs/policy-exceptions.md`** and inline **`<!-- policy-exempt:<tag> -->`** (reason only in audit chat, not in comment).
- **`specs/policy-exceptions.md`:** Registry table + marker rules (AI: list exceptions here; `grep policy-exempt`).
- **`workflow/requirements-audit.md`:** **Beyond defaults** + caching + confirmation; register + marker after approve.

---

## Project scope (what this repo should handle) — review summary

**In scope**

- **Public, developer-facing APIs** under `/api/...`: **anonymous** reads are **read-only**, return **latest** (or clearly scoped “current” data), and favor **minute-level (or coarser)** caching; **session writes** only where the module spec allows (e.g. prices).
- **Data that changes over time** (rates, weather, holidays, DNS, lists, etc.) or **thin caches** over third-party / stored sources — good fit for this product.
- **MCP / Function Calling / Skill** as documentation and tooling around those APIs, plus **platform** routes (auth, cron, admin) with correct security.
- **Exceptions to defaults** only after audit (**why** once) + explicit approve + **`.ai/specs/policy-exceptions.md`** row + **`policy-exempt`** marker in spec.

**Out of scope or default “no” unless separately designed**

- **Pure deterministic utilities** with no external or changing source (e.g. only math / unit conversion) — not a good use of this public API layer.
- **Heavy file pipelines**, unbounded uploads, long-running jobs without async/storage design — prefer **local CLI** or another service.
- **Historical / large retention** storage — default **no**; allowed only when registered as a **policy exception** (current example: TASI under `finance-tasi-history`).

**Consistency check (this review)**

- **`policy-exceptions.md`** “when to add” wording uses **outside defaults** (not “stricter than default”) so it matches both “more storage” and “stricter freshness” cases.
- **Single registry + grep** gives AI a fast inventory of approved overrides alongside **`api-semantics.md`** defaults.

---

## Second pass (2026-03-21): stale pointers and missing `docs/`

### Fixed

- **`context/current.md`** still listed T-001–T-003 as “remaining active” while **`tasks/active/current.md`** marked them done — reconciled: `current.md` now points at **no open tasks** and **`tasks/done/README.md`**.
- **`tasks/active/current.md`** had duplicate `---` blocks and repeated **Done** sections — reduced to a single “no active tasks” line + template.
- **Broken links:** Roadmap and tasks referenced **`docs/adr/0001-public-api-latest-only.md`** and **`docs/specs/overview.md`** but the repo had **no `docs/` tree** — added minimal **`docs/adr/0001-public-api-latest-only.md`** and **`docs/specs/overview.md`** (English; pointers to `.ai/specs/*`).
- **`roadmap.md`**: P0-1 / Phase 1 / Phase 3 wording refreshed for **anonymous read-only + latest** vs **session writes**; P3-DNS task pointer updated from **`tasks/active/current.md`** to **`tasks/done/README.md`**.
- **Per-module spec one-liners** under **`specs/modules/`** still said only “read-only, latest” — aligned with **anonymous** + **exceptions** wording (except **`prices.md`**, which already described the read/write split).
- **`proxy-rule.md`**: added explicit **global convention** note vs **admin** routes.
- **`INDEX.md` maintenance**: module id tables removed — use **`modules-registry.yaml`** instead.

### Third pass (2026-03-21): modules registry

- **Added:** `.ai/specs/modules-registry.yaml` as the **single source of truth** for module `id`, human `title`, `spec` path (or `null`), and `schema` path.
- **Added:** `.ai/generators/validateModulesRegistry.ts` + **`pnpm run validate:modules-registry`**; wired into **`pnpm run validate:ai`** (checks sort order, file existence, orphan `app/<id>/layout.tsx`, orphan `.ai/schemas/*.yaml`).
- **Updated:** `specs/README.md`, `INDEX.md`, `context/summary.md`, `knowledge/glossary.md`, `api-semantics.md` references, `workflow/*`, `skills/module-generator/SKILL.md`, `schemas/README.md`, `.ai/README.md`, `REVIEW.md`.

### AI-facing registry reminders (2026-03-21)

- **`INDEX.md`**, **`rules/global.md`**, **`specs/README.md`**, **`workflow/requirements-audit.md`** + **`module-development.md`**, **`skills/module-generator/SKILL.md`** (+ description), **`skills/README.md`**, **`.ai/README.md`**, **`.cursor/rules/ai-rules.mdc`** (and fixed layout rule paths), **`.cursorrules`**, and **`modules-registry.yaml`** header — all state that **new modules must register in `modules-registry.yaml` before schema/generator/app routes** and run **`pnpm run validate:ai`**.
- **`context/summary.md`**: product scope and ADR lines updated now that **`docs/`** exists.

### Intentional overlap (not duplicate by mistake)

- **`INDEX.md`** (task/topic routing) vs **`rules/global.md`** (exhaustive “do X → read Y”) — use **INDEX** first for narrow tasks; **global** when the table is needed.
