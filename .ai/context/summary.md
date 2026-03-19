# Project summary (one page)

**Product:** unbnd — public API layer for developers; all public APIs are **read-only** and return **latest credit/data** (holiday, fuel-price, exchange-rate, geo, movies, weather, dns, finance, prices). Next.js App Router, Vercel, JWT + optional 2FA.

**Structure:**

- **Specs:** `.ai/specs/` (api-semantics + per-module under `specs/modules/`). Product scope: `docs/specs/overview.md` if present, else `.ai/specs/README.md`.
- **Plans:** `.ai/plans/roadmap.md` (phases 0–3).
- **Tasks:** `.ai/tasks/active/` (current), `backlog/`, `done/`.
- **Rules:** `.ai/rules/global.md` (index); layout under `rules/layout/`. Code style: project `.cursorrules`.
- **Knowledge:** `.ai/knowledge/glossary.md`; ADR in `docs/adr/` (optional).
- **Schemas:** `.ai/schemas/*.yaml` (one per module); generator: `pnpm run generate:module .ai/schemas/<id>.yaml`.
- **Skills:** `.ai/skills/module-generator/SKILL.md` for new modules.

**Modules:** See `.ai/specs/README.md` for the full list: holiday, fuel-price, exchange-rate, geo, movies, weather, dns, finance, prices. Each has 5 sidebar entries (Overview, API, MCP, Function Calling, Skill). API pattern: edge, `api()`, `jsonSuccess`.
