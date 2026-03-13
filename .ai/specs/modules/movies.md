# Movies module (Spec)

Per-module spec for the Movies public API. Global convention: [api-semantics.md](../api-semantics.md) (read-only, latest credit/data). This module is an **example** (latest list from cache; no write or external live fetch from public API).

---

## Purpose

- Provide **latest** movies list from cache (e.g. GIST-backed). Read-only; public API does not trigger TMDB/Maoyan or other live fetch.
- Intended as an example module for the stack (Overview, API, MCP, Function Calling, Skill).

---

## Endpoints

| Method | Path          | Description                                     |
| ------ | ------------- | ----------------------------------------------- |
| GET    | `/api/movies` | Returns latest movies list and cache timestamp. |

---

## Request / response

### GET `/api/movies`

- **Params:** none.
- **Response:** `{ movies: Array<...>, cachedAt: number }` (or equivalent).  
  Represents **latest** cached list; cache headers (e.g. s-maxage=60, stale-while-revalidate=300) apply.
- No auth required for this endpoint in current implementation.

---

## Errors and boundaries

- Cache miss or upstream failure: document actual behavior (e.g. empty list + cachedAt, or 503) per implementation.
- No request parameters; no 400 for body/query.

---

## Semantics (latest only)

- Returns **latest** cached list only; no "as of date" or history.
- Read-only; public API does not mutate cache or trigger external writes.
- Any future "historical list" or "movies as of date" must use a **separate path** and spec.
