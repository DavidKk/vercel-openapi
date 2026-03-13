# Global rules (read first — index)

**This file is the index.** Read it every time so you know where to look. Then open the right rule or doc for the task.

---

## How rules are organized

- **Authority:** All project rules live under `.ai/rules/`. Single source of truth; `.cursor/rules/ai-rules.mdc` only points here.
- **This file (`global.md`):** Minimal index — what to read for which task. No long prose; keep under ~1000 tokens.
- **`module-layout.md`:** Shell (Nav, body, footer), module layout (sidebar + main), sidebar entries order, API/MCP/Skill page structure, class names, API handler pattern.
- **`component-structure.md`:** Where to put components (page vs shared vs root), folder layout, `index.ts` re-exports, import paths.
- **`module-layout.yaml`:** Generator input. For task context read the `.md` files.

---

## Do X → read / do Y

| Task                                                          | Read / do                                                                                                                             |
| ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| **Any change**                                                | This file first, then the row below that matches the task.                                                                            |
| **Layout, sidebar, new module page, API/MCP/Skill structure** | `.ai/rules/module-layout.md`                                                                                                          |
| **Add or move a component, import path, folder**              | `.ai/rules/component-structure.md`                                                                                                    |
| **Start writing code (comments, exports, hooks, style)**      | Project `.cursorrules` (or repo root) — English comments, `export function`, JSDoc, etc.                                              |
| **New module from schema**                                    | `.ai/schemas/<name>.yaml` + `.ai/rules/module-layout.md`; generator under `.ai/generators/` if present.                               |
| **New API route**                                             | Existing `app/api/` patterns; `api()` or `cron()` from `initializer/controller`; respond with `jsonSuccess` / `initializer/response`. |
| **Cron job**                                                  | Use `cron()` wrapper; auth via `CRON_SECRET` (see `services/auth/cron.ts`); path like `app/api/cron/sync/<name>/route.ts`.            |
| **New rule or convention**                                    | Add under `.ai/rules/`; mention in this index if it affects “do X → read Y”.                                                          |

---

## One-line reminders

- Components: segment-scoped or root; one `index.ts` per folder.
- Modules: 5 sidebar entries only (Overview, API, MCP, Function Calling, Skill); class names and structure from `module-layout.md`.
- API: shared wrapper, `jsonSuccess`; cron: `cron()` + `CRON_SECRET`.
- Code style: only when writing — follow `.cursorrules` (English, `export function`, JSDoc).
