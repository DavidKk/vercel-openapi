# SQL

Database initialization scripts.

## China GEO (Supabase)

Used by `/api/geo` and the china-geo service.

**完整步骤见：[CHINA_GEO_SETUP.md](./CHINA_GEO_SETUP.md)** — 按顺序执行：启用 PostGIS → 表/函数 → 导入数据 → 回填 geom → 更新 RPC 返回 bbox → 配置 .env → 自检。

- **init-china-geo.sql** — 建表、PostGIS、函数（含带 bbox 的 `geo_containing_point_deepest`）。
- Environment: `CHINA_GEO_SUPABASE_URL`、`CHINA_GEO_SUPABASE_ANON_KEY` in `.env` (see `.env.example`).
