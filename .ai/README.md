# .ai (for AI)

One place for rules, schemas, generators, skills, specs, plans, tasks, context, and knowledge. Goal: accurate generation. Humans may edit. **All content here is in English** for consistent AI consumption.

---

## Dirs

| Dir             | Read first / use                                                                                                                                                                   |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **context/**    | Aggregated context: `context/current.md` (current focus), `context/summary.md` (one-page project). Load first to minimize tokens.                                                  |
| **rules/**      | `rules/global.md` (index: do X → read Y). Layout: `rules/layout/`. Logging: `rules/logging.md`. Generator: `module-layout.yaml`.                                                   |
| **specs/**      | Requirements. `specs/api-semantics.md`; per-module under `specs/modules/`.                                                                                                         |
| **knowledge/**  | Terms: `knowledge/glossary.md`. ADR: `docs/adr/`.                                                                                                                                  |
| **plans/**      | Product planning. `plans/roadmap.md`; optional `plans/releases/`.                                                                                                                  |
| **tasks/**      | Execution. `tasks/active/current.md` (in progress); `tasks/backlog/`, `tasks/done/`. See `tasks/README.md`.                                                                        |
| **workflow/**   | Process steps. New module → `workflow/module-development.md` (five phases: requirements confirmation → customize → breakdown → generate → raise issues). See `workflow/README.md`. |
| **schemas/**    | One YAML per module. Field contract: `schemas/README.md`. Copy existing YAML, edit, then run generator.                                                                            |
| **generators/** | Commands: `generators/README.md`. Produces `app/<id>/layout.tsx`, `page.tsx`, `api/page.tsx`, `mcp/page.tsx`.                                                                      |
| **skills/**     | `skills/<name>/SKILL.md`. New module → `skills/module-generator/SKILL.md` (after reading workflow).                                                                                |

Outside `.ai/` (optional; create when needed): **`docs/specs/overview.md`** (product scope, modules); **`docs/adr/`** (architecture decision records). If missing, product scope is still in `.ai/specs/` and plans.

---

## When to read what

- **Any code/layout change** → `rules/global.md`, then the row that matches the task.
- **Design or change public API** → `specs/api-semantics.md` first; then rules and `app/api/` patterns.
- **Current plan or task** → `plans/roadmap.md`, `tasks/active/current.md`. Context: `context/current.md`.
- **New module** → **First** read `.ai/workflow/module-development.md` and follow the five phases (requirements confirmation, customize requirements, requirements breakdown, generate module, raise issues). Then `skills/module-generator/SKILL.md` + `schemas/README.md` + schema YAML; run `pnpm run generate:module .ai/schemas/<id>.yaml`.

---

## Commands (repo root)

- **Quality gate (after code changes):** **`pnpm ok`** — runs format, lint, typecheck, unit tests, and e2e tests. Use to verify no issues before considering a module or change done. Fix any failure and re-run until it passes.
- Generate: `pnpm run generate:module .ai/schemas/<id>.yaml`
- Validate: `pnpm run validate:ai` (all schema YAMLs + one generator run). Optional: `SCHEMAS_DIR`.
- Individual: `pnpm format`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm test:e2e`.

---

## Add/change

- **Rule** → Edit under `rules/`; update `rules/global.md` index if "do X → read Y" changes.
- **Doc consistency** → Keep module list in sync: `.ai/specs/README.md`, `.ai/context/summary.md`, and glossary. Use terms from `knowledge/glossary.md` to avoid multiple names for the same concept.
- **Spec** → Edit `specs/api-semantics.md` or `specs/modules/<module>.md`; product overview in `docs/specs/overview.md`.
- **Knowledge** → Edit `knowledge/glossary.md`; ADR in `docs/adr/`.
- **Plan** → Edit `plans/roadmap.md` (or add under `plans/releases/`).
- **Task** → Edit `tasks/active/current.md`; move to `tasks/backlog/` or `tasks/done/` when status changes.
- **Context** → Update `context/current.md` when switching work; keep `context/summary.md` as one-page overview.
- **Module** → Follow `workflow/module-development.md` (requirements → customize → split → generate; raise issues when blocked). Add `schemas/<id>.yaml` per `schemas/README.md`; run generator.
- **Skill** → Add `skills/<name>/SKILL.md`; point IDE to `.ai/skills/`.
- **ADR** → Add under `docs/adr/`; link from specs or rules when relevant.
