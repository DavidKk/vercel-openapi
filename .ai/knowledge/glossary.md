# Glossary (Knowledge)

Definitions used across Spec, Plan, Task, and Rules. Keep entries short.

---

## Public API

Stable, developer-facing HTTP endpoints under `/api/<module>/...` (e.g. `/api/holiday`, `/api/fuel-price`, `/api/exchange-rate`, `/api/geo`, `/api/movies`). Excludes auth, cron, MCP server, and other internal endpoints. Public APIs are **read-only** and return **latest credit/data** unless a separate spec says otherwise.

---

## Latest credit / latest data (资信)

Here **"credit"** means 资信 (trustworthy/current state), not payment or quota. The **current** trustworthy state of data the system exposes: e.g. today's holiday status, latest fuel prices, current exchange rates, current administrative region for given coordinates. "Latest" means no implicit historical or as-of-date query unless explicitly specified in a spec and exposed via a distinct path.

---

## Module

A feature area with its own route prefix (e.g. `holiday`, `fuel-price`, `exchange-rate`, `geo`, `movies`), sidebar entries (Overview, API, MCP, Function Calling, Skill), and optional schema under `.ai/schemas/<id>.yaml`. Layout and structure are defined in `.ai/rules/layout/module-layout.md`.

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

## Function Calling / Skill

- **Function Calling:** API and UI for invoking tools (e.g. holiday check, fuel price) in a chat or automation flow.
- **Skill:** Documented capability (e.g. `.ai/skills/module-generator/SKILL.md`) that tells humans and AI how to perform a class of tasks (e.g. add a new module).
