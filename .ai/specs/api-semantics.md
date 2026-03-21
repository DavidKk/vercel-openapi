# Public API semantics (Spec)

**Authority for “what public APIs do”.** All public API design and implementation must follow this. For product scope, see `docs/specs/overview.md` and `.ai/specs/README.md` and module specs.

---

## Definition: Public API

**Public API** means the stable, developer-facing HTTP endpoints exposed under paths such as:

- `/api/holiday`, `/api/holiday/list`
- `/api/fuel-price`, `/api/fuel-price/[province]`, …
- `/api/exchange-rate`
- `/api/geo`
- `/api/movies`
- `/api/news/sources`, `/api/news/feed`
- `/api/weather`
- `/api/dns`
- `/api/finance/...` (e.g. TASI company/summary daily) <!-- policy-exempt:finance-tasi-history --> — approved exception; registry: `.ai/specs/policy-exceptions.md`
- `/api/proxy-rule/clash/config` (merged Clash RULE-SET line prefixes; query `type`)
- `/api/prices`, `/api/prices/products`, `/api/prices/search`, `/api/prices/products/search`, `POST /api/prices/calc` — **read** paths: latest gist-backed catalog; **writes** on `/api/prices/products` (POST/PUT/DELETE) require **session** (see `.ai/specs/modules/prices.md`)
- (and any future module under `/api/<module>/...`)

Excluded: auth (`/api/auth`), cron (`/api/cron`), MCP (`/api/mcp`), install-skill, authenticated admin routes (e.g. `/api/proxy-rule/admin/...`), and other internal or admin endpoints. Session-guarded **write** routes are excluded from the **anonymous read-only** rule but remain part of the developer-facing API surface; see per-module specs (e.g. prices).

---

## Core convention: Public API = query latest credit/data

All **unauthenticated, public data** access **must** satisfy:

1. **Read-only for anonymous callers** — no create/update/delete of domain data **without** authentication where the module allows writes. Modules may define **session-authenticated** POST/PUT/DELETE (e.g. `/api/prices/products`); those routes are **not** anonymous public writes. See `.ai/specs/modules/prices.md`.
2. **Latest data** — read responses represent the **current** available data (e.g. today’s holiday status, latest fuel prices, current exchange rates, current region for given coordinates). No implicit “as of date” or historical versions unless explicitly specified in a separate spec or registered in `.ai/specs/policy-exceptions.md`.
3. **Stable contract** — response shapes should be forward-compatible; avoid breaking changes.

If a feature requires **historical or versioned** queries, it must be:

- Described in a spec (e.g. under `docs/specs/` or `.ai/specs/`), and
- Exposed via a **different path** (e.g. `/api/holiday/history`), not by overloading the default “latest” endpoint.

---

## Defaults vs exceptions (history, cache, DB)

**Defaults:** Prefer **latest** snapshots, **minute-level (or coarser)** caching, and **no** open-ended historical storage — keeps DB and ops light. Weather, holiday, fuel-price, exchange-rate, etc. follow these defaults unless registered otherwise.

**Going past defaults** (e.g. long-lived historical tables, tighter-than-minute freshness guarantees): needs **extra confirmation** in the requirements audit — developer states **why** once before approving. After approval: register in **`.ai/specs/policy-exceptions.md`** and add inline **`<!-- policy-exempt:<tag> -->`** next to the feature in spec (tag only, no reason in the comment — like `eslint-disable-next-line`). See that file for the list and marker rules.

**Stricter than default** rules still apply: historical/versioned behavior uses **separate paths** from “latest” endpoints (see core convention above).

---

## Cacheable / large-query APIs (browser-first cache)

APIs that return **large or expensive-to-query data** that is stable or long-lived (e.g. reverse geocode, holiday list by year) **must**:

1. **Support GET with query or path params** — same params ⇒ same URL ⇒ browser and Vercel can cache by URL. No POST-only for cacheable reads.
2. **Use long-lived Cache-Control** — e.g. `CACHE_CONTROL_LONG_LIVED` (1 year) so the same URL is served from browser cache first, then server. Import from `@/initializer/response` (re-exports from `initializer/response/cache-control.ts`).
3. **Be called from the client only via AJAX (fetch)** — **do not** call these from client components via Server Actions. Server Actions run on the server per request; the response is not cacheable by the browser, so refresh/navigation cannot hit cache. Use `fetch('/api/...?params')` from the client so the browser (and Vercel) can cache the response.

Server-side callers (e.g. other API routes, MCP tools, Server Components that need the data for initial render) may still call the underlying service or the API; the rule applies to **client-side** usage so that **browser cache** and **same-params = cache hit** work.

---

## Errors and boundaries

- Use HTTP status and a consistent JSON shape (e.g. `jsonSuccess` with optional `error` or error payload).
- For “not found” or “out of scope” (e.g. China GEO point outside China), return a clear message (e.g. 404 with a short reason). See existing `app/api/geo/route.ts` for an example.

---

## Per-module specs (split requirements)

Each **module** (holiday, fuel-price, exchange-rate, geo, movies, news, weather, dns, finance, prices, proxy-rule, …) should normally have its own **module spec** that defines:

- Purpose and scope of that module’s public API
- Endpoints: method, path, query/body params, response shape
- **Caching:** layers + minimum refresh granularity (defaults: minute-level or coarser)
- **Policy:** if not default (history, etc.), register in `policy-exceptions.md` + `policy-exempt` marker
- Edge cases and errors (e.g. invalid year, out-of-region)
- Any module-specific rules (e.g. “list returns latest official data for the given year”)

**Where:** `.ai/specs/modules/<module>.md` (e.g. `.ai/specs/modules/holiday.md`). If a per-module spec is intentionally deferred, keep **`spec: null`** with **`notes`** in **`.ai/specs/modules-registry.yaml`** until the spec is added. Canonical ids: **`.ai/specs/modules-registry.yaml`**; index: `.ai/specs/README.md`.

**Relationship:** Module specs **inherit** the global convention from this document (anonymous reads: latest credit/data + stable contract; authenticated writes only where documented). They add **module-level** detail; exceptions use **policy-exceptions.md** + `policy-exempt` markers, or per-module auth write sections (e.g. prices).

---

## References

- ADR: `docs/adr/0001-public-api-latest-only.md` (decision: anonymous public reads = latest credit/data by default; exceptions per policy registry)
- Policy exception registry + markers: `.ai/specs/policy-exceptions.md`
- Module registry: `.ai/specs/modules-registry.yaml` (index: `.ai/specs/README.md`)
- Implementation rules: `.ai/rules/global.md`, `.ai/rules/layout/module-layout.md`
- Code style: project `.cursorrules`
- Glossary: `.ai/knowledge/glossary.md`
