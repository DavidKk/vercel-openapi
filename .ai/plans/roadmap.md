# Roadmap (Plan)

Product development plan for the openapi project. This document describes the **targets and phases** that correspond to the product in its current state: requirements live in `docs/specs/overview.md` and `.ai/specs/api-semantics.md`; the plan below is the goal structure that leads from those requirements to the delivered capabilities.

---

## Phase 0: Foundation

**Goal:** Define product scope, public API semantics, and the platform so all later modules follow the same contract and layout.

### Deliverables

| ID   | Target                                                             | Outcome (current)                                                                       |
| ---- | ------------------------------------------------------------------ | --------------------------------------------------------------------------------------- |
| P0-1 | Product spec: public API layer, read-only, latest credit/data only | `docs/specs/overview.md`; out-of-scope clearly stated.                                  |
| P0-2 | API semantics and glossary                                         | `.ai/specs/api-semantics.md`, `.ai/knowledge/glossary.md`; rules reference them.        |
| P0-3 | Platform: Next.js App Router, Vercel; JWT auth, optional 2FA       | `app/api/auth`, env (JWT*SECRET, 2FA, ACCESS*\*).                                       |
| P0-4 | API pattern: edge runtime, `api()`, `jsonSuccess`, Cache-Control   | `initializer/controller`, `initializer/response`; used by all public API routes.        |
| P0-5 | Module layout and rules                                            | `.ai/rules/layout/module-layout.md` (shell, sidebar 5 entries, API/MCP doc+playground). |
| P0-6 | Module generator and schemas                                       | `.ai/generators/`, `.ai/schemas/*.yaml`; one schema per module.                         |
| P0-7 | ADR for "public API = latest only"                                 | `docs/adr/0001-public-api-latest-only.md`.                                              |

---

## Phase 1: Core data modules

**Goal:** Deliver the four core modules (Holiday, Fuel Price, Exchange Rate, Geolocation), each with REST API, Overview UI, API doc + Playground, MCP tools, and optional Function Calling / Skill pages. All APIs comply with "query latest credit/data only".

### Deliverables

| ID   | Target                                                     | Outcome (current)                                                                                        |
| ---- | ---------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| P1-1 | Holiday: today/date holiday check, list; calendar Overview | `app/api/holiday`, `app/api/holiday/list`; `app/holiday/` (Calendar, api, mcp, function-calling, skill). |
| P1-2 | Fuel Price: by province, promo; table Overview             | `app/api/fuel-price`, `app/api/fuel-price/[province]`, promo; `app/fuel-price/`.                         |
| P1-3 | Exchange Rate: current rates; Overview                     | `app/api/exchange-rate`; `app/exchange-rate/`.                                                           |
| P1-4 | Geolocation: reverse geocode (mainland China); Overview    | `app/api/geo`; `app/geo/`.                                                                               |
| P1-5 | Per-module: MCP tools registered, API/MCP Playgrounds      | `app/api/mcp/tools/{holiday,fuel-price,exchange-rate,geo}/`; playgrounds in each module.                 |
| P1-6 | Global Nav and shared layout                               | `app/Nav/`, DashboardSidebar; all modules in nav.                                                        |

---

## Phase 2: Integration and example module

**Goal:** Unified MCP server and Function Calling support; one example module (Movies) to validate the full stack; E2E coverage for main flows.

### Deliverables

| ID   | Target                                                               | Outcome (current)                                                                |
| ---- | -------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| P2-1 | MCP server and tool registry                                         | `app/api/mcp/`, `app/api/mcp/tools/index.ts`, tools per category.                |
| P2-2 | Function Calling: chat + tools by category                           | `app/api/function-calling/chat`, `tools`, `[category]/tools`; module pages.      |
| P2-3 | Movies module (example): latest list, API, MCP, Overview, all 5 tabs | `app/api/movies`, `app/movies/`, cron sync (e.g. movies-gist).                   |
| P2-4 | Skill install and Skill pages                                        | `app/api/install-skill`, `app/api/skills/[name]`; `app/<module>/skill/page.tsx`. |
| P2-5 | E2E tests for critical public API and flows                          | Playwright; `pnpm test:e2e`.                                                     |

---

## Phase 3: Extensions (ongoing)

**Goal:** New modules or features added only per spec and task; each addition follows the same semantics (public API = latest credit/data) and layout (schema → generator, API, MCP, Playgrounds).

### How to use this phase

- Add a new row or milestone when a **new module or feature** is planned (from `docs/specs/overview.md` or `.ai/tasks/active/`).
- Done when: schema exists, generator run, API/MCP/Playground/Skill pages in place, aligned with `.ai/specs/api-semantics.md`; E2E or integration tests for new paths as needed.

---

## How to update

- **Reflecting current product:** Phases 0–2 describe the plan that produced the current capabilities; update the "Outcome (current)" column when the codebase or docs change.
- **New work:** Add milestones under Phase 3 (or a new phase) and link to the spec/task that defines the requirement.
- Keep entries short; link to specs or ADRs for rationale.
