# Public API semantics (Spec)

**Authority for “what public APIs do”.** All public API design and implementation must follow this. For product scope, see `docs/specs/overview.md`.

---

## Definition: Public API

**Public API** means the stable, developer-facing HTTP endpoints exposed under paths such as:

- `/api/holiday`, `/api/holiday/list`
- `/api/fuel-price`, `/api/fuel-price/[province]`, …
- `/api/exchange-rate`
- `/api/geo`
- `/api/movies`
- (and any future module under `/api/<module>/...`)

Excluded: auth (`/api/auth`), cron (`/api/cron`), MCP (`/api/mcp`), install-skill, and other internal or admin endpoints. Those may have different semantics; this spec applies only to **public** data APIs above.

---

## Core convention: Public API = query latest credit/data

All public APIs **must** satisfy:

1. **Read-only** — no mutation of business state; no create/update/delete of domain data via these endpoints.
2. **Latest data** — responses represent the **current** available data (e.g. today’s holiday status, latest fuel prices, current exchange rates, current region for given coordinates). No implicit “as of date” or historical versions unless explicitly specified in a separate spec.
3. **Stable contract** — response shapes should be forward-compatible; avoid breaking changes.

If a feature requires **historical or versioned** queries, it must be:

- Described in a spec (e.g. under `docs/specs/` or `.ai/specs/`), and
- Exposed via a **different path** (e.g. `/api/holiday/history`), not by overloading the default “latest” endpoint.

---

## Errors and boundaries

- Use HTTP status and a consistent JSON shape (e.g. `jsonSuccess` with optional `error` or error payload).
- For “not found” or “out of scope” (e.g. geolocation outside mainland China), return a clear message (e.g. 404 with a short reason). See existing `app/api/geo/route.ts` for an example.

---

## Per-module specs (split requirements)

Each **module** (holiday, fuel-price, exchange-rate, geo, movies, …) should have its own **module spec** that defines:

- Purpose and scope of that module’s public API
- Endpoints: method, path, query/body params, response shape
- Edge cases and errors (e.g. invalid year, out-of-region)
- Any module-specific rules (e.g. “list returns latest official data for the given year”)

**Where:** `.ai/specs/modules/<module>.md` (e.g. `.ai/specs/modules/holiday.md`). See `.ai/specs/README.md` for the list and template.

**Relationship:** Module specs **inherit** the global convention from this document (read-only, latest credit/data, stable contract). They add **module-level** detail; they do not override the core convention unless a spec explicitly states an exception and uses a distinct path (e.g. history).

---

## References

- Module specs index: `.ai/specs/README.md`
- Implementation rules: `.ai/rules/global.md`, `.ai/rules/layout/module-layout.md`
- Code style: project `.cursorrules`
- Glossary: `.ai/knowledge/glossary.md`
