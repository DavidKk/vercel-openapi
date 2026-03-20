# SQL

Database initialization scripts.

## China GEO (Supabase)

Used by `/api/geo` and the china-geo service.

**完整步骤见：[CHINA_GEO_SETUP.md](./CHINA_GEO_SETUP.md)** — 按顺序执行：启用 PostGIS → 表/函数 → 导入数据 → 回填 geom → 更新 RPC 返回 bbox → 配置 .env → 自检。

- **init-china-geo.sql** — 建表、PostGIS、函数（含带 bbox 的 `geo_containing_point_deepest`）。
- Environment: `CHINA_GEO_SUPABASE_URL`、`CHINA_GEO_SUPABASE_ANON_KEY` in `.env` (see `.env.example`).

## Finance – TASI (Turso)

Used by `/api/finance/tasi/*` and cron sync tasi-sync. **Data flow:** today is read from KV snapshot (if not expired) or remote; DB is backup only. New trading days are written to DB then KV snapshot. See **services/finance/tasi/README.md** for full scheme (KV expiry, write rules, cron as fallback).

- **init-tasi-turso.sql** — `tasi_company_daily` (date, code, payload), `tasi_market_summary` (date, payload). Run once via `turso db shell <db-name> < sql/init-tasi-turso.sql` or Turso dashboard.
- Environment: same Turso as rest of app (`TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`), plus `TASI_FEED_URL` for today's data and cron.
