# Project summary (one page)

**Product:** unbnd — public API layer for developers; **anonymous** `/api/...` usage is **read-only** + **latest credit/data** by default for all feature modules listed in **`.ai/specs/modules-registry.yaml`** (including most **prices** reads). **Session-authenticated writes** exist where the module spec says so (e.g. **prices** product CRUD). Next.js App Router, Vercel, JWT + optional 2FA.

**AI process:** New features and new public API work require a **mandatory requirements audit** (`.ai/workflow/requirements-audit.md`) — checklist, **work-type** classification, explicit developer approval — **before** module schema, generator runs, or route implementation. Then follow `.ai/workflow/module-development.md`.

**Work types (summary):** (A) public read-only data APIs, (B) geo/scoped data, (C) reference/example modules, (D) finance/vertical reads, (E) prices (public read + auth write split), (F) proxy-rule public vs admin, (G) platform (auth, cron, MCP, skills), (H) docs-only, (I) out of scope (e.g. heavy file processing → local/separate service). Full table in `requirements-audit.md`.

**Data policy:** Defaults = latest snapshots + minute-level caching + light DB. Past that → audit + reason once, then register **`.ai/specs/policy-exceptions.md`** and **`<!-- policy-exempt:<tag> -->`** in spec. Full list: that file + `grep policy-exempt`.

**Structure:**

- **Specs:** `.ai/specs/` (api-semantics + **`modules-registry.yaml`** + per-module under `specs/modules/`). Product scope: `docs/specs/overview.md` (short); detail in `.ai/specs/README.md` and `api-semantics.md`.
- **Plans:** `.ai/plans/roadmap.md` (phases 0–3).
- **Tasks:** `.ai/tasks/active/` (current), `backlog/`, `done/`.
- **Rules:** `.ai/rules/global.md` (index); layout under `rules/layout/`. Code style: project `.cursorrules`.
- **Knowledge:** `.ai/knowledge/glossary.md`; ADR: `docs/adr/0001-public-api-latest-only.md`.
- **Schemas:** `.ai/schemas/*.yaml` (one per module); generator: `pnpm run generate:module .ai/schemas/<id>.yaml`.
- **Skills:** `.ai/skills/module-generator/SKILL.md` for new modules.

**Modules:** Canonical ids and paths: **`.ai/specs/modules-registry.yaml`**. Each module has 5 sidebar entries (Overview, API, MCP, Function Calling, Skill). API pattern: edge, `api()`, `jsonSuccess`. Run **`pnpm run validate:ai`** after registry changes.
