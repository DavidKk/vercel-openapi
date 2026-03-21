# .ai (for AI)

One place for rules, schemas, generators, skills, specs, plans, tasks, context, and knowledge. Goal: accurate generation. Humans may edit. **All content here is in English** for consistent AI consumption.

**Fast lookup (avoid reading every file):** **[`INDEX.md`](./INDEX.md)** — task/topic routing. **Module ids:** [`specs/modules-registry.yaml`](./specs/modules-registry.yaml).

---

## Dirs

| Dir             | Read first / use                                                                                                                                                                                                    |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **context/**    | Aggregated context: `context/current.md` (current focus), `context/summary.md` (one-page project). Load first to minimize tokens.                                                                                   |
| **rules/**      | `rules/global.md` (index: do X → read Y). Layout: `rules/layout/`. Logging: `rules/logging.md`. Generator: `module-layout.yaml`.                                                                                    |
| **specs/**      | Requirements. **`specs/modules-registry.yaml`** (canonical module ids). `specs/api-semantics.md`; per-module under `specs/modules/`.                                                                                |
| **knowledge/**  | Terms: `knowledge/glossary.md`. ADR: `docs/adr/0001-public-api-latest-only.md` (see also `../docs/specs/overview.md`).                                                                                              |
| **plans/**      | Product planning. `plans/roadmap.md`; optional `plans/releases/`.                                                                                                                                                   |
| **tasks/**      | Execution. `tasks/active/current.md` (in progress); `tasks/backlog/`, `tasks/done/`. See `tasks/README.md`.                                                                                                         |
| **workflow/**   | Process steps. **New feature** → `workflow/requirements-audit.md` (mandatory) → `workflow/module-development.md` (five phases). See `workflow/README.md`.                                                           |
| **schemas/**    | One YAML per module. Field contract: `schemas/README.md`. Copy existing YAML, edit, then run generator.                                                                                                             |
| **generators/** | Commands: `generators/README.md`. Produces `app/<id>/layout.tsx`, `page.tsx`, `api/page.tsx`, `mcp/page.tsx`.                                                                                                       |
| **skills/**     | `skills/<name>/SKILL.md`. New module → `skills/module-generator/SKILL.md` (after reading workflow). Agent-ready **API** skill doc template → `skills/api-agent-skill-template/SKILL.md` + `specs/skill-writing.md`. |

Outside `.ai/` (human-facing product docs): **`docs/specs/overview.md`** (short product scope); **`docs/adr/`** (ADRs). Detail and module contracts remain in **`.ai/specs/`**.

---

## When to read what

- **Unsure where to start** → **`INDEX.md`** (task/topic → file), then open only listed paths.
- **Any code/layout change** → `rules/global.md`, then the row that matches the task.
- **Design or change public API** → `specs/api-semantics.md` first; then rules and `app/api/` patterns.
- **Current plan or task** → `plans/roadmap.md`, `tasks/active/current.md`. Context: `context/current.md`.
- **New module or new public API** → **First** read `.ai/workflow/requirements-audit.md` and complete the checklist (developer approval). Then read `.ai/workflow/module-development.md` and follow the five phases. **Before schema/generator:** edit **`.ai/specs/modules-registry.yaml`** + **`specs/modules/<id>.md`** (see **`specs/README.md`**). Then `skills/module-generator/SKILL.md` + `schemas/README.md` + schema YAML; run `pnpm run generate:module .ai/schemas/<id>.yaml`. Run **`pnpm run validate:ai`** before calling the module done.

---

## Commands (repo root)

- **Quality gate (after code changes):** **`pnpm ok`** — runs format, lint, typecheck, unit tests, and e2e tests. Use to verify no issues before considering a module or change done. Fix any failure and re-run until it passes.
- **AI / schema / module list:** **`pnpm run validate:ai`** — schema YAML, generator smoke test, **modules registry** + drift vs `app/` and `.ai/schemas/`. **`pnpm run validate:modules-registry`** runs only the registry step.
- Generate: `pnpm run generate:module .ai/schemas/<id>.yaml`
- Validate: `pnpm run validate:ai` (all schema YAMLs + one generator run). Optional: `SCHEMAS_DIR`.
- Individual: `pnpm format`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm test:e2e`.

---

## Add/change

- **New INDEX row** → When a new recurring task type or top-level doc appears, add a row to **`INDEX.md`** so AI routing stays one-hop.
- **Rule** → Edit under `rules/`; update `rules/global.md` index if "do X → read Y" changes.
- **Doc consistency** → **`.ai/specs/modules-registry.yaml`** is the canonical module list; then refresh `.ai/specs/README.md` intro if needed, `.ai/context/summary.md`, and `knowledge/glossary.md` prose. Run **`pnpm run validate:ai`**. Use terms from `knowledge/glossary.md` to avoid multiple names for the same concept.
- **Spec** → Edit `specs/api-semantics.md` or `specs/modules/<module>.md`; product overview in `docs/specs/overview.md`.
- **Knowledge** → Edit `knowledge/glossary.md`; ADR in `docs/adr/`.
- **Plan** → Edit `plans/roadmap.md` (or add under `plans/releases/`).
- **Task** → Edit `tasks/active/current.md`; move to `tasks/backlog/` or `tasks/done/` when status changes.
- **Context** → Update `context/current.md` when switching work; keep `context/summary.md` as one-page overview.
- **Module** → Follow `workflow/requirements-audit.md` then `workflow/module-development.md` (requirements → customize → split → generate; raise issues when blocked). Add `schemas/<id>.yaml` per `schemas/README.md`; run generator.
- **Skill** → Add `skills/<name>/SKILL.md`; follow `.ai/specs/skill-writing.md` for an agent-ready doc; point IDE to `.ai/skills/`.
- **ADR** → Add under `docs/adr/`; link from specs or rules when relevant.
