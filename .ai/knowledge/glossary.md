# Glossary (Knowledge)

Definitions used across Spec, Plan, Task, and Rules. Keep entries short.

---

## Public API

Stable, developer-facing HTTP endpoints under `/api/<module>/...`. Examples: `/api/holiday`, `/api/fuel-price`, `/api/exchange-rate`, `/api/geo`, `/api/movies`, `/api/weather`, `/api/dns`, `/api/finance/...`. Excludes auth, cron, MCP server, and other internal endpoints. Public APIs are **read-only** and return **latest credit/data** unless a separate spec says otherwise. Use this term consistently; do not mix with "REST API" for these same endpoints unless in a generic sentence.

---

## Latest credit / latest data

Here **"credit"** means the current trustworthy state of data (not payment or quota). The **current** trustworthy state of data the system exposes: e.g. today's holiday status, latest fuel prices, current exchange rates, current administrative region for given coordinates. "Latest" means no implicit historical or as-of-date query unless explicitly specified in a spec and exposed via a distinct path.

---

## Module

A feature area with its own route prefix (e.g. `holiday`, `fuel-price`, `geo`, `movies`, `weather`, `dns`, `finance`), five sidebar entries (Overview, API, MCP, Function Calling, Skill), and optional **module schema** under `.ai/schemas/<id>.yaml`. Layout and structure are defined in `.ai/rules/layout/module-layout.md`. In this repo, "module" always means this UI+API feature area; the **module id** is the route segment (e.g. `geo`, not "china-geo").

---

## Generator (module generator)

The script that produces the **module shell** from a **module schema**: `app/<id>/layout.tsx`, `page.tsx`, `api/page.tsx`, `mcp/page.tsx`. Run: `pnpm run generate:module .ai/schemas/<id>.yaml` or call `createModuleFromSchema(schemaPath)` from `.ai/generators/skill.ts`. Do not confuse with "code generator" in the abstract; here "generator" means this specific module scaffold.

---

## MCP (Model Context Protocol) tools

Tools exposed via the project's MCP server (`/api/mcp`), callable by AI or other clients. Each module may expose tools under `app/api/mcp/tools/<category>/`. Tool behavior should align with public API semantics when they return the same kind of data (latest only, read-only).

---

## Cache layers (L0, L1, L2)

When we say **L0**, **L1**, or **L2** we mean these cache tiers (client → server):

- **L0** — **Browser IndexedDB** (local, client-only). Used by client components that call the API; keyed by request (e.g. base currency, year, URL path). Reduces repeat requests and works offline within TTL. Do not import L0 modules from server or API routes.
- **L1** — **Server in-memory** (e.g. LRU with TTL). Per-process; lost on restart. First server-side lookup before L2 or upstream.
- **L2** — **Server persistent** (e.g. Turso). Shared across processes/instances; survives restarts. Used when L1 misses.

Flow: **L0 → (request) → L1 → L2 → upstream**; on success write back L2 then L1 (and from client, L0).

---

## Overview (module)

The **first sidebar entry** of every module and the main view at `/<module>` (e.g. `/holiday`, `/finance/tasi`). Content is **not** generated from the module schema; it is module-specific (calendar, table, form, etc.). The generator produces an empty placeholder; the developer specifies or leaves it empty. Do not confuse with "product overview" or "spec overview."

---

## Schema (module) / module schema

The YAML file `.ai/schemas/<id>.yaml` that defines a module for the **generator**: `id`, `name`, `routePrefix`, `apiPage`, `mcpPage`, optional `sidebarItems`. It does **not** define Overview page content. Use "module schema" or "schema" in module context to avoid confusion with API response schemas or TypeScript types.

---

## Function Calling / Skill (disambiguation)

- **Function Calling:** In this project, the **fourth sidebar tab** of each module: API and UI for invoking MCP-style tools (e.g. holiday check, fuel price) in a chat or automation flow. Route: `/<module>/function-calling`.
- **Skill (module tab):** The **fifth sidebar tab** of each module: page at `/<module>/skill` that shows install instructions and downloadable API skill content (e.g. for Cursor). Use **ApiSkillPanel** and a `<module>-api-skill.md` download.
- **Skill (AI skill / SKILL.md):** A documented capability under `.ai/skills/<name>/SKILL.md` that tells humans and AI how to perform a class of tasks (e.g. add a new module). Not the same as the module's "Skill" tab.
