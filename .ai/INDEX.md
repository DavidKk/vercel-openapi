# .ai quick index (for AI)

**Purpose:** Task → file lookup. **Do not** open every `.ai/**` file by default; use this page, then drill into listed paths only.

**AI — adding a new feature module (mandatory):** Start with **`workflow/requirements-audit.md`** and get explicit developer approval. **After the audit passes**, add a row to **[`specs/modules-registry.yaml`](./specs/modules-registry.yaml)** (`id`, `title`, `spec`, `schema`; keep `modules` **sorted by `id`**), then add **`.ai/specs/modules/<id>.md`** unless **`spec: null`** + **`notes`** (deferred spec), then create **`.ai/schemas/<id>.yaml`**, run **`pnpm run generate:module`**, finish with **`pnpm run validate:ai`**, and only then treat the module as aligned.

**Suggested load order**

1. **`INDEX.md`** (this file) — pick rows for your task.
2. **`context/current.md`** — active task pointer (if any).
3. **`context/summary.md`** — one-page product + process (optional if task is narrow).
4. **`rules/global.md`** — canonical “do X → read Y” if not covered below.

---

## By task (start here)

| Task                                                  | Open first                                    | Then (if needed)                                                                                                                                                            |
| ----------------------------------------------------- | --------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| New feature / new module / new `/api` route           | `workflow/requirements-audit.md`              | `workflow/module-development.md`, **`specs/modules-registry.yaml`** (after audit pass), `skills/module-generator/SKILL.md`, `schemas/README.md`, **`pnpm run validate:ai`** |
| **Add/remove a module (ids, specs, drift)**           | **`specs/modules-registry.yaml`**             | **`pnpm run validate:modules-registry`**, `specs/README.md`                                                                                                                 |
| Change public API behavior                            | `specs/api-semantics.md`                      | `specs/policy-exceptions.md`, `specs/modules/<id>.md`, `rules/layout/module-layout.md`                                                                                      |
| List approved policy overrides / `policy-exempt` tags | `specs/policy-exceptions.md`                  | `rg "policy-exempt" .ai`                                                                                                                                                    |
| Layout, sidebar, module pages                         | `rules/layout/module-layout.md`               | `rules/layout/component-structure.md`                                                                                                                                       |
| Logging in server code                                | `rules/logging.md`                            | —                                                                                                                                                                           |
| JSDoc / comment style                                 | `rules/comment-spec.md` + root `.cursorrules` | —                                                                                                                                                                           |
| Module schema YAML / generator                        | `schemas/README.md`                           | `generators/README.md`, `schemas/<id>.yaml`                                                                                                                                 |
| Agent-ready API skill doc                             | `specs/skill-writing.md`                      | `skills/api-agent-skill-template/SKILL.md`                                                                                                                                  |
| Product direction                                     | `plans/roadmap.md`                            | `tasks/active/current.md`                                                                                                                                                   |
| Doc drift / changelog                                 | `REVIEW.md`                                   | —                                                                                                                                                                           |
| Term definitions                                      | `knowledge/glossary.md`                       | —                                                                                                                                                                           |

---

## By topic (keyword → file)

| Topic                                                     | File                                                                                                                                                         |
| --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Module ids, spec paths, schema paths (canonical)**      | **`specs/modules-registry.yaml`**                                                                                                                            |
| Public API = anonymous read-only + latest                 | `specs/api-semantics.md`                                                                                                                                     |
| Session writes (e.g. prices CRUD)                         | `specs/modules/prices.md`, `specs/api-semantics.md`                                                                                                          |
| History / DB exceptions / TASI                            | `specs/policy-exceptions.md`, `specs/api-semantics.md`                                                                                                       |
| Browser cache / `Cache-Control` / GET for cacheable reads | `specs/api-semantics.md` (section “Cacheable / large-query APIs”)                                                                                            |
| MCP tools registration pattern                            | `skills/module-generator/SKILL.md`, `app/api/mcp/tools/` (code)                                                                                              |
| **MCP HTTP server, resources, one-click IDE install**     | **`knowledge/glossary.md`** (MCP section), `app/api/mcp/` (routes, `installSnippets.ts`, `moduleSkillResources.ts`, `skillNaming.ts`, `pricesToolFilter.ts`) |
| Cron auth                                                 | `rules/global.md` → `services/auth/cron.ts` (code)                                                                                                           |
| Quality gate                                              | root `README.md` / `.ai/README.md` → **`pnpm ok`**                                                                                                           |

---

## Module id → paths (derive from registry)

Do **not** duplicate tables here. Open **`specs/modules-registry.yaml`**: each `id` has `spec` (e.g. `modules/holiday.md` → read `.ai/specs/modules/holiday.md`) and `schema` (e.g. `schemas/holiday.yaml` → `.ai/schemas/holiday.yaml`).

---

## Skills (`.ai/skills/`)

| Skill              | Path                                       |
| ------------------ | ------------------------------------------ |
| Module generator   | `skills/module-generator/SKILL.md`         |
| API skill template | `skills/api-agent-skill-template/SKILL.md` |

Index with bundled/UI notes: **`skills/README.md`**.

---

## Repo paths outside `.ai/` (hot)

| Area               | Path                                                                                                     |
| ------------------ | -------------------------------------------------------------------------------------------------------- |
| API route pattern  | `app/api/<module>/route.ts`, `initializer/controller.ts` (`api`), `initializer/response` (`jsonSuccess`) |
| Project code style | root `.cursorrules`                                                                                      |

---

## Maintenance

When adding a **new module**: run **requirements audit first**, then update **`specs/modules-registry.yaml`** (sorted by `id`), then add spec/schema/code, then run **`pnpm run validate:ai`**. Optionally refresh **`knowledge/glossary.md`** examples if the public API list in prose should change.
