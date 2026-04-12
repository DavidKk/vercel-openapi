# Finance (TASI) data flow

## Roles

- **KV (Upstash)**: Current-day snapshot (`tasi-daily.json` payload). Source of truth for "today" when not expired. Must have a TTL; after expiry we re-fetch from remote.
- **DB (Turso)**: Backup / history only. Not used for "current" read. New trading days are written here for backup and for K-line / history APIs.
- **Remote (cf-feed-bridge)**: Live data. Used when the KV snapshot is expired or missing.

## Read path (today)

1. **KV first**: If a snapshot exists for the trading day and is **not expired** → return it (no remote call).
2. **If KV snapshot expired or missing**: Fetch from remote (bridge). Then apply write rules (below) and return the fresh data.

Past dates and K-line: always read from DB (Turso).

## KV snapshot expiry

- Each snapshot includes an `updatedAt` (ISO timestamp). Snapshot is considered **expired** when `(now - updatedAt) > TASI_SNAPSHOT_TTL_MS` (e.g. 2 hours).
- No `updatedAt` or invalid value → treat as expired so we re-fetch.

## Write rules (when we have fresh data from remote)

Applied after any fetch from remote (either from a read that found KV expired, or from cron).

1. **New data date equals previous snapshot date** (same trading day, refresh): **Update KV only.** Do not write DB. Then return/continue.
2. **New data date differs from previous snapshot, or no snapshot** (new day or first run): **Write DB first, then update KV.** (DB is backup; writing it first avoids losing the day if KV write fails later.)

So: same date → KV only; new date → DB + KV.

## Cron (tasi-sync)

- Runs the same logic: fetch from remote, then apply the write rules above.
- **Purpose**: Fallback so that even with no user traffic, no trading day is missed (data is still fetched and persisted).

## Summary

| What            | Role    | Read (today)                     | Write rule                             |
| --------------- | ------- | -------------------------------- | -------------------------------------- |
| KV snapshot     | Current | First, if not expired            | Always updated when we have fresh data |
| Remote (bridge) | Live    | When KV snapshot expired/missing | N/A (source only)                      |
| DB (Turso)      | Backup  | Not used for today               | Only when new date (new day)           |

## IndexedDB (browser)

- **Same schema as Turso**: `tasi_company_daily` (date + code → payload), `tasi_market_summary` (date → payload, **updatedAt**). Uses the app shared DB (`unbnd-idb`).
- **Expiry (same as server snapshot)**: Summary rows store `updatedAt` (ISO). Cache is used only when **not expired**: `(now - updatedAt) <= TASI_SNAPSHOT_TTL_MS`. No “today” check; if expired we fetch from API.
- **APIs** (browser-only): `getLatestValidSnapshotFromIdb` (returns `{ company, summary }` or null when missing/expired), `isIdbSnapshotExpired`, `readCompanyDailyByDateFromIdb`, `readSummaryByDateFromIdb`, `writeCompanyDailyToIdb`, `writeSummaryToIdb`, `getLatestSnapshotDateFromIdb`. See `services/finance/tasi/browser/`.
