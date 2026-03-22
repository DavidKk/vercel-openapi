# Logging

**All server-side modules must add logging.** Use the project logger so logs are prefixed with module name and trace ID. Read this when adding or changing API routes, services, cron jobs, or actions.

---

## How to add logs

1. **Import and create a module logger** (once per file):

   ```ts
   import { createLogger } from '@/services/logger'

   const logger = createLogger('module-name')
   ```

   Use a short, stable name (e.g. `api-dns`, `api-finance-tasi-company-daily`, `cron-movies-sync`, `finance-tasi-fetch`, `gist`).

2. **Use the logger instead of `console`**  
   Do not use `console.log` / `console.warn` / `console.error` in server code. Use `logger.info`, `logger.ok`, `logger.warn`, `logger.fail` so output is consistent and traceable.

3. **Where to log**

   - **API routes:** At least one log per request (e.g. at handler entry with key query/body params). Log errors in `catch` with `logger.fail`.
   - **Cron routes:** Log start and completion (and result summary, e.g. count).
   - **Services:** Log important operations (cache hit/miss, external call, write) and all failures (`logger.fail` in `catch` or on invalid response).
   - **Actions:** Log entry for main exported functions and failures.

4. **What to log**
   - **info:** Request or operation start; ongoing context. Do not log secrets or full request bodies.
   - **ok:** Successful milestone you want to filter separately from `info` (e.g. feed merged, response built). Prefix in logs is `[ok]`.
   - **warn:** Recoverable or expected edge cases (e.g. file not found, invalid but handled input).
   - **fail:** Errors and failures (e.g. HTTP failure, parse error, thrown exception). Include enough context to debug (e.g. `{ url, status }`, `{ message }`).

---

## Examples

- Route: `logger.info('request', { date, code })` at start; `logger.fail('DNS lookup failed', { domain, message })` in catch.
- Cron: `logger.info('sync start')` then `logger.info('sync done', { count })`.
- Service: `logger.info('GIST snapshot read', { date, companyCount })`; `logger.fail('fetchGist failed', { gistId, status })`.

---

## Reference

- Logger implementation: `services/logger/index.ts` — `createLogger(moduleName)` returns `{ info, ok, warn, fail }`.
- News module structured logs: `services/news/structured-news-log.ts` — `logNewsStructured()` for `message` + JSON (`flow`, `event`, fields).
- Existing usage: `services/finance/tasi/*.ts`, `app/api/weather/route.ts`, `app/api/cron/sync/finance-sync/route.ts`, `services/gist/index.ts`, `services/fetch/index.ts`.
