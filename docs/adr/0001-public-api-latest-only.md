# ADR 0001: Public API — latest credit/data (anonymous read-only by default)

## Status

Accepted

## Context

The openapi product exposes HTTP APIs for developers. We need a single contract for what “public” means and how reads behave.

## Decision

- **Public `/api/...` usage without session auth** is **read-only** and returns **latest** (or clearly scoped “current”) **credit/data** from this layer’s perspective, unless a module spec and **policy exception** explicitly document otherwise.
- **Session-authenticated writes** are allowed only where the module spec allows (e.g. prices product CRUD).
- Exceptions to defaults (history, heavier retention, stricter freshness, etc.) require registration in `.ai/specs/policy-exceptions.md` and inline `policy-exempt` markers per project process.

## Consequences

- Module specs and `.ai/specs/api-semantics.md` remain the operational source of truth; this ADR records the architectural intent.
- Contributors align on “latest snapshot” defaults before adding exceptions.

## References

- `.ai/specs/api-semantics.md`
- `.ai/specs/policy-exceptions.md`
- `.ai/knowledge/glossary.md`
