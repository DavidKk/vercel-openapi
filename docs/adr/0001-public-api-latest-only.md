# ADR 0001: Public API returns latest data only

**Status:** Accepted  
**Date:** (fill when merging)

---

## Context

We need a clear rule for what “public API” means so that implementations and AI-generated code stay consistent. The product goal is to offer developers a simple, reliable way to **query current state** (holidays, fuel prices, exchange rates, geolocation), not to support historical analysis or write operations through the same endpoints.

---

## Decision

- **All public APIs** (paths under `/api/<module>/...` for data) are **read-only** and return **latest credit/data** only.
- Historical or versioned queries are **out of scope** unless we add a dedicated spec and a **separate path** (e.g. `/api/holiday/history`).
- This is documented in `.ai/specs/api-semantics.md` and referenced from rules and `.ai/knowledge/glossary.md`.

---

## Consequences

- **Positive:** Single, clear contract; less ambiguity for AI and humans; smaller surface area to test and maintain.
- **Negative:** Any future “history” feature requires explicit design and new routes.
- **Action:** New or changed public API handlers must conform to this; rules and skills reference the spec.
