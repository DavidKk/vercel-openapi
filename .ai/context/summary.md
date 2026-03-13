# Project summary (one page)

**Product:** Vercel OpenAPI — public API layer for developers; all public APIs are **read-only** and return **latest credit/data** (holiday, fuel price, exchange rate, geo, movies). Next.js App Router, Vercel, JWT + optional 2FA.

**Structure:**

- **Specs:** `.ai/specs/` (api-semantics + per-module under `specs/modules/`). Product scope: `docs/specs/overview.md`.
- **Plans:** `.ai/plans/roadmap.md` (phases 0–3).
- **Tasks:** `.ai/tasks/active/` (current), `backlog/`, `done/`.
- **Rules:** `.ai/rules/global.md` (index); layout under `rules/layout/`. Code style: project `.cursorrules`.
- **Knowledge:** `.ai/knowledge/glossary.md`; ADR in `docs/adr/`.
- **Schemas:** `.ai/schemas/*.yaml` (one per module); generator: `pnpm run generate:module .ai/schemas/<id>.yaml`.
- **Skills:** `.ai/skills/module-generator/SKILL.md` for new modules.

**Modules (5):** holiday, fuel-price, exchange-rate, geo, movies. Each: Overview, API, MCP, Function Calling, Skill (5 sidebar entries). API pattern: edge, `api()`, `jsonSuccess`.
