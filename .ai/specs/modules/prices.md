# Prices module (Spec)

Per-module spec for the Prices feature area. Global convention: [api-semantics.md](../api-semantics.md). This module mixes **anonymous reads** (latest product snapshot) with **session-authenticated writes** on `/api/prices/products` (POST/PUT/DELETE).

---

## Purpose

- Expose **current** price list / product catalog and helpers (search, comparison calc) for developers and UI.
- Allow **authenticated** product CRUD via HTTP for managers (`/prices/manage` parity).

---

## Data semantics

- Product list (and related data) are stored in **KV** (Upstash Redis); reads reflect the **latest** published data.
- **CRUD** mutates KV-backed data and **requires** authenticated session (enforced in actions).
- Overview (`/prices`) is publicly readable; manage UI (`/prices/manage`) requires session.

---

## HTTP API (implemented)

| Method | Path                             | Auth                                      | Description                                                                                                      |
| ------ | -------------------------------- | ----------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| GET    | `/api/prices`                    | No                                        | Index: list names + all products + counts.                                                                       |
| GET    | `/api/prices/products`           | No                                        | All products.                                                                                                    |
| GET    | `/api/prices/products?id=<id>`   | **Yes** (for single-id fetch per actions) | One product by id; 403 if not authorized when restricted.                                                        |
| POST   | `/api/prices/products`           | **Yes**                                   | Create product.                                                                                                  |
| PUT    | `/api/prices/products?id=<id>`   | **Yes**                                   | Update product.                                                                                                  |
| DELETE | `/api/prices/products?id=<id>`   | **Yes**                                   | Delete product.                                                                                                  |
| GET    | `/api/prices/search?q=`          | No                                        | Keyword search over products.                                                                                    |
| GET    | `/api/prices/products/search?q=` | No                                        | Same search under nested path.                                                                                   |
| POST   | `/api/prices/calc`               | No                                        | Compare “current” catalog entry prices for a formula input (read-only; uses latest `getAllProducts()` snapshot). |

---

## Public API vs `api-semantics` read-only rule

- **Anonymous** callers: only the **GET** (and **POST /calc**) paths above behave as **read-only** public data reads; responses reflect **latest** KV data.
- **POST/PUT/DELETE** on `/api/prices/products` are **not** unauthenticated public writes; they require session. See [api-semantics.md](../api-semantics.md) clarification on authenticated writes.

---

## Caching

- **HTTP (CDN/browser):** Anonymous KV-backed **GET** reads (`/api/prices`, `/api/prices/products` list, `/api/prices/search`, `/api/prices/products/search`) use `CACHE_CONTROL_KV_CATALOG` (~2 min `max-age`/`s-maxage`, `stale-while-revalidate=300`). See `initializer/response/cache-control.ts`.
- **No shared cache:** `GET ?id=…`, all **POST/PUT/DELETE** on products, and **POST /api/prices/calc** use `private, no-store` (auth-sensitive or body-dependent).
- **Clearing HTTP cache:** wait for TTL, change URL (e.g. query bust), or Vercel/CDN purge; see file comment on `cache-control.ts`.
- Optional: document L1/L2 if introduced for `getAllProducts()`.

---

## MCP / UI

- MCP tools for prices may omit create/update/delete for unauthenticated sessions (see `app/api/mcp` / function-calling patterns).
- Skill / UI endpoints under `/api/ui/skills/prices` serve markdown content (public vs logged-in variants) — not the same as `/api/prices` data API.

---

## Errors

- Validation failures → 400 via `invalidParameters`.
- Missing auth on protected product operations → 403 `jsonForbidden`.
- Missing product → 404 where applicable.
