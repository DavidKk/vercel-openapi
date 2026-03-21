# Product overview (openapi layer)

**Product:** unbnd — a public API layer for developers (Next.js on Vercel).

## In scope

- **Anonymous** access to `/api/...` for **read-only**, **latest** (or clearly scoped current) **data** where modules allow it; design favors **minute-level** or coarser freshness and cacheability.
- **Session-authenticated** operations only where the **module spec** documents them (e.g. prices writes).
- MCP, Function Calling, and Skill surfaces as tooling around those APIs.

## Authority

- Detailed semantics: `.ai/specs/api-semantics.md`
- **Which modules exist (ids):** `.ai/specs/modules-registry.yaml`
- Per-module behavior: `.ai/specs/modules/*.md`
- Policy exceptions: `.ai/specs/policy-exceptions.md`
- Architectural decision: `docs/adr/0001-public-api-latest-only.md`
- Plan: `.ai/plans/roadmap.md`

## Out of scope (by default)

See `.ai/specs/api-semantics.md` and `.ai/REVIEW.md` (project scope summary) for defaults and exceptions.
