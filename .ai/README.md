# .ai (for AI)

One place for rules, schemas, generators, skills. Goal: accurate generation. Humans may edit.

---

## Dirs

| Dir | Read first / use |
|-----|------------------|
| **rules/** | `rules/global.md` (index: do X → read Y). Then `module-layout.md`, `component-structure.md`. Generator uses `module-layout.yaml`. |
| **schemas/** | One YAML per module. Field contract: `schemas/README.md`. Copy existing YAML, edit, then run generator. |
| **generators/** | Commands and entry: `generators/README.md`. Produces `app/<id>/layout.tsx`, `page.tsx`, `api/page.tsx`, `mcp/page.tsx`. |
| **skills/** | `skills/<name>/SKILL.md`. New module → `skills/module-generator/SKILL.md`. |

---

## When to read what

- **Any code/layout change** → `rules/global.md`, then the row that matches the task.
- **New module** → `skills/module-generator/SKILL.md` + `schemas/README.md` + one schema YAML; run `pnpm run generate:module .ai/schemas/<id>.yaml`.

---

## Commands (repo root)

- Generate: `pnpm run generate:module .ai/schemas/<id>.yaml`
- Validate: `pnpm run validate:ai` (all schema YAMLs + one generator run). Optional: `SCHEMAS_DIR`.

---

## Add/change

- **Rule** → Edit under `rules/`; update `rules/global.md` index if "do X → read Y" changes.
- **Module** → Add `schemas/<id>.yaml` per `schemas/README.md`; run generator.
- **Skill** → Add `skills/<name>/SKILL.md`; point IDE to `.ai/skills/`.
