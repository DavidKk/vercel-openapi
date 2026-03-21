# Requirements audit (mandatory)

**Authority:** Any **new feature**, **new module**, **new public API surface**, or **material behavior change** must pass this audit **before** writing module schema YAML, running the module generator, or implementing routes/tools. Bug fixes and typo-only edits may skip items marked optional.

**New module (after audit passes, before schema/generator/code):** Add the new `id` to **`.ai/specs/modules-registry.yaml`** and add **`.ai/specs/modules/<id>.md`** (or `spec: null` + `notes`) per **`.ai/specs/README.md`**. Skipping this breaks **`pnpm run validate:ai`**.

**Goal:** Prevent shipping scope that conflicts with product rules, overloads serverless limits, or belongs in a local tool instead of this service.

---

## When the audit applies

| Situation                                                  | Audit depth                                          |
| ---------------------------------------------------------- | ---------------------------------------------------- |
| New module or new `/api/...` route                         | **Full**                                             |
| New MCP tool or Function Calling exposure for new behavior | **Full** (same contract as API unless internal-only) |
| Large refactor touching public routes                      | **Full** for affected endpoints                      |
| Docs-only (`.ai/`, `docs/`, comments)                      | **Light**: confirm no accidental normative change    |
| Typo, lint, test-only                                      | **Skip**                                             |

---

## Audit checklist (must be explicit before implementation)

Answer each item. If any answer is “unknown”, **stop** and ask the developer (see `module-development.md` Phase 5).

1. **Problem & user** — Who calls this (HTTP client, MCP, UI)? What is the single success criterion?
2. **Work type** — Which **category** from the taxonomy below applies?
3. **Public API rules** — If the change touches **`/api/...`** (see `.ai/specs/api-semantics.md`): for **anonymous** callers, is it **read-only**, **latest data**, and **stable contract**? Auth writes must match module spec. History or non-latest needs **separate path** + **policy exception** when applicable.
4. **Data source** — Upstream API key, rate limits, ToS, and **personal-data / PII** risk? Can responses be **cached** (URL or body key) without breaking freshness expectations?
5. **Hosting fit** — Fits **Edge** or **Node** runtime limits (timeout, memory, body size)? Any **long-running** or **multi-GB** work? If yes, default answer: **not this repo’s public API** unless a separate job/queue design is spec’d.
6. **Security** — User-supplied URLs (SSRF), file uploads, auth bypass? **Cron** and **admin** routes must stay protected (`CRON_SECRET`, session).
7. **Documentation gate** — Per-module behavior needs `.ai/specs/modules/<module>.md` (or update to existing). **No code** for new public behavior without an agreed spec line for endpoints and semantics.
8. **Beyond defaults** — Anything stricter than product defaults (historical/long-lived DB, sub-minute “real-time”, unbounded retention, etc.): **stop** until the developer **states why** in the audit thread and **explicitly approves**. After approve: add a row to **`.ai/specs/policy-exceptions.md`** and an inline **`<!-- policy-exempt:<tag> -->`** in the relevant spec (tag only; no reason inside the comment). For a quick list of all marked features, read that registry (and `grep policy-exempt`).
9. **Caching plan** — New public data endpoints document cache layers + accept **minute-level (or coarser)** unless a registered exception says otherwise.
10. **Developer confirmation** — Short summary + explicit approve before implementation.

---

## Work type taxonomy (this repository)

Use one **primary** label per request. This aligns with existing modules in **`.ai/specs/modules-registry.yaml`** and `app/api/`.

| Type                                          | Description                                                                                                                                      | Typical deliverables                                                                                                                              |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| **A. Public data API (read-only)**            | Latest snapshot data for developers; `GET`/`POST` under `/api/<module>/...` per `api-semantics.md`.                                              | `app/api/...`, `app/actions/...`, service + cache, `.ai/specs/modules/<module>.md`, optional schema + generator shell                             |
| **B. Geo / scoped data**                      | Region-bound or provider-scoped (e.g. China geo, weather). Same rules as A; extra boundary errors (404 out of region).                           | Same as A; document coverage in module spec                                                                                                       |
| **C. Reference / example module**             | Thin cache over a stable source (e.g. movies list); read-only, documented as example.                                                            | Same as A; spec states “example” semantics                                                                                                        |
| **D. Finance / domain vertical**              | Numeric or time-series reads (e.g. TASI). Overrides (e.g. history) → **policy-exceptions.md** + `policy-exempt` marker.                          | Spec + routes; registry row if not default                                                                                                        |
| **E. Prices / mixed public + auth**           | Public reads possible; **mutations** only with session/auth; document which routes are public vs protected.                                      | Spec must list public vs auth endpoints; MCP may filter tools by session                                                                          |
| **F. Proxy-rule (public read + admin write)** | Public: merged Clash payload. **Admin** mutates KV; not “public API” per `api-semantics.md`.                                                     | Two specs or one spec with clear sections; never mix admin into “public data API” list without intent                                             |
| **G. Platform / integration**                 | Auth, cron, MCP manifest, install-skill, skills ZIP — **not** governed as Public API; still need security and logging review.                    | Routes + `.ai/rules/logging.md`; no relaxation of secrets                                                                                         |
| **H. Docs / spec only**                       | Requirements, ADR, skill text, roadmap — no runtime.                                                                                             | Markdown only; if the change affects modules, update **`.ai/specs/modules-registry.yaml`** and run **`pnpm run validate:ai`** per `.ai/REVIEW.md` |
| **I. Out of scope here**                      | Heavy file processing, unbounded uploads, long jobs, or primary value is **local privacy** — prefer **CLI / local service** or separate product. | Do **not** implement as public `/api` without a dedicated design doc; suggest alternative                                                         |

---

## Outcomes

| Outcome        | Action                                                                                                                                |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| **Pass**       | Proceed to `module-development.md` Phase 1 (or straight to breakdown if scope is tiny and already fully specified).                   |
| **Spec-first** | Write or update `.ai/specs/modules/<module>.md` (and `api-semantics` if the public list changes); developer confirms; then implement. |
| **Defer**      | Record in `.ai/tasks/backlog/`; do not implement now.                                                                                 |
| **Reject**     | Explain mismatch (e.g. violates anonymous read-only or undocumented auth writes); propose Type I alternative or separate service.     |

---

## References

- Public API definition: `.ai/specs/api-semantics.md`
- Approved policy overrides (list + marker convention): `.ai/specs/policy-exceptions.md`
- Module list: `.ai/specs/modules-registry.yaml` (index: `.ai/specs/README.md`)
- Five-phase implementation: `.ai/workflow/module-development.md`
- Index: `.ai/rules/global.md`
