# Module development workflow

When adding or generating a **new feature module**, follow these phases **in order**. Do not skip to schema or code until the previous phase has a clear outcome. If anything is unclear or blocked, **ask the developer** (Phase 5) and wait for a reply before continuing.

**AI / humans — order matters:** First pass **`.ai/workflow/requirements-audit.md`** and obtain explicit developer approval. **After the audit passes**, before **`.ai/schemas/<id>.yaml`**, the **generator**, or **`app/<id>/`**, add a row to **`.ai/specs/modules-registry.yaml`** (sorted by `id`) and add **`.ai/specs/modules/<id>.md`** unless **`spec: null`** + **`notes`**. Details: **`.ai/specs/README.md`**. Run **`pnpm run validate:ai`** before considering the module complete.

---

## Requirements audit (mandatory — before Phase 1)

**Before** starting Phase 1 below for any **new module**, **new public `/api` behavior**, or **material feature request**:

1. Read and apply **`.ai/workflow/requirements-audit.md`** (checklist + work-type classification).
2. Record outcome: **pass**, **spec-first**, **defer**, or **reject**. If **spec-first**, add or update `.ai/specs/modules/<module>.md` and get developer confirmation **before** schema or code.
3. Obtain **explicit developer approval** on the short summary and classification (not only silence).

Phases 1–5 assume the audit has **passed** or **spec-first** documentation is already agreed. Skipping the audit to “save time” is not allowed.

---

## Quick reference (for AI)

| Phase | Name                      | Key action                                                                                                             | Done when                                                                        |
| ----- | ------------------------- | ---------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| 1     | Requirements confirmation | Confirm scope & success criteria with developer                                                                        | You have a short written summary **confirmed** by developer                      |
| 2     | Customize requirements    | Agree API, Overview, MCP concretely                                                                                    | You have a concrete list **confirmed** by developer                              |
| 3     | Requirements breakdown    | Produce implementation checklist                                                                                       | Checklist written; open questions listed; no unraised conflicts with rules/specs |
| 4     | Generate module           | **Registry** (`modules-registry.yaml`) → schema → generator → implement → tests → **`validate:ai`** → format/lint/test | Module works; tests added; `pnpm ok` passes; **`pnpm run validate:ai`** passes   |
| 5     | Raise issues              | When blocked: stop, ask, wait                                                                                          | Developer has answered; then resume from the step where you stopped              |

**Entry:** User says “add a module” or “generate a module” → complete **`.ai/workflow/requirements-audit.md`** first, then start at **Phase 1**. Do not create schema or code until Phase 2–3 are complete and confirmed. **Phase 4 step 1** is still **`.ai/specs/modules-registry.yaml`** (see Phase 4 actions).

---

## Phase 1 — Requirements confirmation

- **Goal:** Agree with the developer what the module is for and what “done” looks like.
- **Trigger:** User requests a new module (or you are about to create one).

### Actions (do in order)

1. **Read** `.ai/specs/api-semantics.md` to know project constraints (anonymous public reads: read-only, latest data; session writes only where module spec allows).
2. **If the developer already gave a clear brief** (scope + success criteria in one message): summarize it in 2–4 sentences and **present it back** for confirmation before continuing.
3. **If the developer only gave a name or vague idea:** ask for clarification using the questions below. Do not assume scope or start writing schema/code.

### Questions to ask the developer (when scope is unclear)

- “What problem should this module solve, and who will use it (API callers, MCP, dashboard users)?”
- “What should work at the end? For example: ‘User can query X via REST and see Y on the Overview.’”
- “Any constraints (data source, auth, rate limits) or references to existing modules we should align with?”

### Deliverable

- A **short written summary** (2–5 sentences) of: module purpose, main users, and success criteria.
- This summary must be **confirmed** by the developer (e.g. “Yes” or “Correct”) before you proceed to Phase 2.

### Completion criteria

- You have a written summary.
- Developer has confirmed it **explicitly**.
- You have **not** started writing schema or code.

### When to use Phase 5 (raise an issue)

- Developer did not provide scope and does not answer the clarification questions.
- Summary conflicts with `.ai/specs` (e.g. “write API” without a separate spec); raise the conflict and ask how to proceed.

---

## Phase 2 — Customize requirements

- **Goal:** Fix the concrete shape of the module so it can be implemented without guesswork.
- **Trigger:** Phase 1 is complete (summary confirmed).

### Actions (do in order)

1. **API:** With the developer, agree on:
   - Endpoints: path(s), method(s) (GET/POST).
   - Request shape (query params or body).
   - Response shape (fields, example).
   - Semantics: anonymous read-only + latest data (per `.ai/specs/api-semantics.md`) unless module spec documents auth writes or a separate history spec exists.
2. **Overview:** Ask: “How should the Overview tab be displayed (e.g. calendar, table, form, list)? Or leave it empty for now?” If no answer, plan **empty placeholder**.
3. **MCP:** Agree on tool names, parameters, and return shape. Match existing style in `app/api/mcp/tools/`.
4. **Optional:** Function Calling and Skill pages needed? Any caching, auth, or special rules?

### Deliverable

- A **concrete list** you can turn into schema and code:
  - API: for each endpoint: method, path, request shape, response shape (or example).
  - Overview: “empty” or one-sentence description (e.g. “table of daily prices by province”).
  - MCP: for each tool: name, params, return shape.
- This list must be **confirmed** by the developer before Phase 3.

### Completion criteria

- API, Overview, and MCP are specified (Overview may be “empty”).
- No ambiguous wording (e.g. “something like X” without a concrete shape); if there is, ask once more.
- You have **not** started writing schema or code.

### When to use Phase 5 (raise an issue)

- Developer insists on behavior that violates `.ai/specs` (e.g. public write API with no spec); state the conflict and ask how to proceed.
- Request is ambiguous after one round of questions; ask with 1–2 concrete options (e.g. “Option A: empty Overview. Option B: table with columns X, Y. Which?”).

---

## Phase 3 — Requirements breakdown

- **Goal:** Turn the agreed requirements into a concrete implementation plan and checklist.
- **Trigger:** Phase 2 is complete (concrete list confirmed).

### Actions (do in order)

1. **Schema (YAML):** Plan `.ai/schemas/<module-id>.yaml`:
   - `id`, `name`, `routePrefix`.
   - Optional: `sidebarItems` (e.g. first item `iconName`).
   - `apiPage`: title, subtitle, endpoints (method, path, description, optional exampleResponse), playgroundComponentName, playgroundImportPath.
   - `mcpPage`: title, subtitle, tools (name, description, optional paramsDescription), playgroundComponentName, playgroundImportPath.
   - Do **not** add an `overview` block (Overview content is not from schema). See `.ai/schemas/README.md`.
2. **Overview:** If Phase 2 said “empty”, plan: leave generator placeholder as-is. If Phase 2 specified UI, plan: component name, location (`app/<id>/components/`), and data flow (client-only vs server fetch).
3. **API:** List route file(s), e.g. `app/api/<id>/route.ts` and any nested segments; response shape and any shared services.
4. **MCP:** List tools and file location (`app/api/mcp/tools/<category>/`), plus registration in `app/api/mcp/tools/index.ts`.
5. **Other:** Nav entry in `app/Nav/index.tsx`; optional Function Calling / Skill pages.
6. **Open questions:** List any remaining unknowns. If any requirement conflicts with `.ai/rules` or `.ai/specs`, **raise it** to the developer (Phase 5) before implementing.

### Deliverable

- An **implementation checklist** (see template below). Optionally show it to the developer: “I will implement in this order; any change?”
- A short list of **open questions** (or “None”). Resolve any that would block Phase 4.

### Checklist template (output this in Phase 3)

```text
[ ] Registry: .ai/specs/modules-registry.yaml (new row, sorted by id) + specs/modules/<id>.md (or spec: null + notes)
[ ] Schema: .ai/schemas/<module-id>.yaml (id, name, routePrefix, apiPage, mcpPage, optional sidebarItems)
[ ] Generator: pnpm run generate:module .ai/schemas/<module-id>.yaml
[ ] Overview: <empty | component name and path>
[ ] API: app/api/<id>/route.ts (and nested if any)
[ ] MCP tools: app/api/mcp/tools/... + register
[ ] API Playground: app/<id>/api/components/
[ ] MCP Playground: app/<id>/mcp/components/
[ ] Nav: app/Nav/index.tsx
[ ] Optional: function-calling/page.tsx, skill/page.tsx
[ ] Tests: unit (__tests__/**/*.spec.ts) and e2e (__webtests__/ or Playwright) for new code
Open questions: <list or "None">
```

### Completion criteria

- Checklist is complete and matches Phase 2.
- Open questions are listed; blockers are raised to the developer and resolved.
- You have **not** run the generator or written implementation code yet (except possibly a draft schema for review).

### When to use Phase 5 (raise an issue)

- A requirement conflicts with `.ai/rules` or `.ai/specs`; describe the conflict and ask for a decision.
- You cannot fill the checklist without making assumptions; list the assumptions and ask the developer to confirm or correct.

---

## Phase 4 — Generate module

- **Goal:** Produce the module shell and implement the agreed behavior.
- **Trigger:** Phase 3 is complete (checklist and open questions resolved).

### Actions (do in order)

1. **Registry:** Add or update **`.ai/specs/modules-registry.yaml`** (keep `modules` sorted by `id`). Add **`.ai/specs/modules/<id>.md`** unless **`spec: null`** is intentional (document in **`notes`**).
2. **Schema:** Create or edit `.ai/schemas/<module-id>.yaml` per Phase 2–3. Copy an existing schema (e.g. `.ai/schemas/holiday.yaml`) and adapt; do not add `overview`.
3. **Generator:** Run `pnpm run generate:module .ai/schemas/<module-id>.yaml` from repo root (or use `createModuleFromSchema` from `.ai/generators/skill.ts` and write the four files). If it fails, go to Phase 5 and report the error.
4. **Overview:** If Phase 2 said “empty”, leave `app/<id>/page.tsx` as the generated placeholder. If Phase 2 specified UI, implement the component under `app/<id>/components/`, re-export from `index.ts`, and use it in `app/<id>/page.tsx` (async + fetch if needed).
5. **API:** Implement `app/api/<id>/route.ts` (and nested routes if any) with `runtime = 'edge'`, `api()`, `jsonSuccess()`. Follow `.ai/rules/layout/module-layout.md` and `.ai/specs/api-semantics.md`.
6. **MCP:** Implement tools under `app/api/mcp/tools/`, register in `app/api/mcp/tools/index.ts`. Match schema `mcpPage.tools`.
7. **Playgrounds:** Implement API and MCP Playground components under `app/<id>/api/components/` and `app/<id>/mcp/components/`; re-export; names and import paths must match schema.
8. **Nav:** Add the module to `app/Nav/index.tsx` (e.g. `NAV_ITEMS`): href, title, icon.
9. **Optional:** Add `app/<id>/function-calling/page.tsx` and `app/<id>/skill/page.tsx` if agreed in Phase 2.
10. **Verify:** Run **`pnpm run validate:ai`**; it checks schemas, the generator, and **modules-registry** drift. Fix any failures. Do not silently work around generator or rule conflicts—escalate to Phase 5.
11. **Tests:** Add test cases to cover new or modified code. See **Quality gate** below for locations and naming. At minimum: unit tests for API routes, services, and non-trivial components; add e2e (e.g. `__webtests__/<module>/` or Playwright) if the module has critical user flows. Fix or add tests until the new code is covered.
12. **Quality gate:** Run format, lint, typecheck, and tests so the project passes the full check. From repo root run:
    - **`pnpm ok`** — runs `pnpm format && pnpm lint && pnpm typecheck && pnpm test && pnpm test:e2e`. Use this to verify there are no issues before considering the module done. If any step fails, fix the cause (format, fix lint errors, fix types, add or fix tests) and re-run until `pnpm ok` passes. (Run **`pnpm run validate:ai`** before or with release prep — it is not part of **`pnpm ok`** by default.)

### Quality gate (format, lint, test)

- **Format:** `pnpm format` (Prettier). Run before commit so style is consistent.
- **Lint:** `pnpm lint` (ESLint with fix). Fix all reported issues.
- **Typecheck:** `pnpm typecheck` (TypeScript `tsc --noEmit`). Resolve type errors.
- **Unit tests:** `pnpm test` (Jest). Unit tests live under `__tests__/` with `.spec.ts` suffix; mirror the source structure (e.g. `__tests__/app/api/<module>/route.spec.ts`). Test case naming: `should [expected behavior] [conditions/scenarios]` (see root `.cursorrules`). Add or update tests so new code is covered.
- **E2E tests:** `pnpm test:e2e` (Playwright). E2E specs in `__webtests__/` or Playwright config. Add specs for critical module flows if applicable.
- **Full check:** **`pnpm ok`** runs all of the above in sequence. Phase 4 is not complete until `pnpm ok` passes.

### Deliverable

- A working module: layout, Overview (or placeholder), API, MCP, Playgrounds, Nav, matching the Phase 2–3 agreement.
- If something cannot be implemented as agreed (e.g. generator overwrote custom Overview), **stop and ask** the developer (Phase 5) instead of guessing.

### Completion criteria

- All checklist items from Phase 3 are done (including tests planned).
- Generator has been run successfully; no unhandled errors.
- API response shape matches what was agreed; Overview is either empty or matches the agreed description.
- Nav entry is present; module is reachable from the app.
- **Test cases added** for new or modified code (unit and e2e as needed); coverage is adequate for the new behavior.
- **`pnpm ok` passes** (format, lint, typecheck, test, test:e2e). If it fails, fix the cause and re-run until it passes.

### When to use Phase 5 (raise an issue)

- Generator fails or overwrites something important (e.g. existing Overview); report and ask whether to restore by hand or change the workflow.
- Implementation requires a decision that was not agreed (e.g. error format, fallback UI); ask the developer.
- A rule or spec conflict appears during implementation; state it and ask how to proceed.

---

## Phase 5 — Raise issues when problems occur

- **Goal:** Avoid silent assumptions and wrong implementations. Use whenever you are blocked or unsure.
- **When to use:** Anytime during Phases 1–4 when:
  - The developer’s request is ambiguous or missing (e.g. no Overview design, unclear API contract).
  - Requirements conflict with `.ai/specs` or `.ai/rules` (e.g. write operation in a public API without a spec).
  - The generator fails or overwrites something unexpectedly.
  - Multiple valid implementations exist and the “right” one depends on product intent.
  - You would have to **guess** to continue.

### Actions

1. **Stop** the current step. Do not continue with assumptions.
2. **State** clearly what is unclear or conflicting (1–3 sentences).
3. **Ask** the developer for a decision or clarification. If helpful, offer 1–2 concrete options (e.g. “Option A: … Option B: … Which do you prefer?”).
4. **Do not** invent requirements or bypass rules without explicit developer approval.
5. **Resume:** After the developer answers, continue from the step where you stopped (or from the phase they indicate).

### Deliverable

- A clear **question or short issue description** for the developer.
- After reply: resume work and, if needed, briefly note what was decided so the next steps stay consistent.

### Completion criteria

- The developer has been asked; you have not assumed an answer.
- When the developer has replied, you have resumed from the correct step and have not silently changed the agreed requirements.

---

## Summary for AI

1. **Requirements confirmation** — Get a short written summary of scope and success criteria; **confirm with developer**; do not assume.
2. **Customize requirements** — Agree on API (paths, shapes), Overview (or empty), MCP (tools, params); **confirm with developer**; resolve ambiguities by asking.
3. **Requirements breakdown** — Produce implementation checklist and open questions; raise conflicts with rules/specs; **do not** run generator or implement yet.
4. **Generate module** — **Registry** → schema → generator → implement → **add tests** → run **`pnpm run validate:ai`** → run **`pnpm ok`** (format, lint, typecheck, test, test:e2e); if stuck, go to Phase 5.
5. **Raise issues** — When blocked or ambiguous: stop, state the issue, ask the developer, wait for reply, then resume.

**Entry point:** When the user says “add a module” or “generate a module”, complete the **requirements audit** (`.ai/workflow/requirements-audit.md`), then start with **Phase 1**. Present the workflow briefly and confirm requirements before creating any schema or code.
