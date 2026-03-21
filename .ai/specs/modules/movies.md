# Movies module (Spec)

Per-module spec for the Movies public API. Global convention: [api-semantics.md](../api-semantics.md) (anonymous read-only + latest credit/data; authenticated routes and policy exceptions per that spec). This module is an **example** (latest list from cache; no write or external live fetch from public API).

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

## Troubleshooting: no Maoyan data

- **Data flow:** List is merged from Maoyan (topRated + mostExpected) + TMDB, then cached in GIST. The public API only reads cache; it never calls Maoyan/TMDB.
- **If the UI shows “TMDB only” (no Maoyan):** The cache was likely filled when Maoyan fetch failed (e.g. timeout or network from Vercel to `apis.netstart.cn`). Merge uses `Promise.allSettled`, so TMDB-only is still saved.
- **Fix:** Trigger the **cron** (Node runtime) to refresh cache: call `GET /api/cron/sync/movies-sync` with `CRON_SECRET`. Check Vercel logs for `Maoyan fetch result: topRated=N, mostExpected=M`. If both are 0, Maoyan is unreachable from the deployment environment; try running the cron from a Node context (e.g. GitHub Actions or same cron route).
- **Note:** If cache is empty, the first request to `/api/movies` runs a one-shot merge in the same runtime (Edge). Edge fetch to `apis.netstart.cn` may fail; subsequent cache is then TMDB-only until cron (Node) runs.

---

## Semantics (latest only)

- Returns **latest** cached list only; no "as of date" or history.
- Read-only; public API does not mutate cache or trigger external writes.
- Any future "historical list" or "movies as of date" must use a **separate path** and spec.
