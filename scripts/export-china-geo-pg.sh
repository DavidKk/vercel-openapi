#!/usr/bin/env bash
set -euo pipefail

# Export the Supabase Postgres database used for china_geo (PostGIS + RPC) via pg_dump.
# Prefer `pnpm run export:china-geo` (Node script adds IPv4 hostaddr — avoids IPv6-only timeouts).
# This shell script is `pnpm run export:china-geo:direct` (no hostaddr rewrite).
#
# Prerequisites:
#   - PostgreSQL client tools (`pg_dump`). macOS: `brew install libpq && brew link --force libpq`
#   - CHINA_GEO_DATABASE_URL — Postgres URI from Supabase (NOT the REST URL CHINA_GEO_SUPABASE_URL).
#
# Where to get the URI:
#   Supabase Dashboard → Project Settings → Database → Connection string → URI.
#   Password is the database password (reset there if unknown), not the anon/service API keys.
#
# Troubleshooting "connection timed out" (often IPv6):
#   Direct host db.<ref>.supabase.co:5432 may resolve to IPv6; some networks block or break IPv6.
#   Fix A: Use the "Session pooler" (or pooler) URI from the same page — host like
#   aws-0-<region>.pooler.supabase.com port 6543, user often postgres.<project_ref> — copy from UI.
#   Fix B: Resolve IPv4 and connect to the A record, e.g. dig +short db.<ref>.supabase.co A
#   then build URI with that IPv4 as host and ?sslmode=require (or test from phone hotspot).
#
# Usage:
#   export CHINA_GEO_DATABASE_URL='postgresql://postgres.[ref]:PASSWORD@...:5432/postgres'
#   ./scripts/export-china-geo-pg.sh
#
# Or load from a local env file (do not commit secrets):
#   set -a && source .env.local && set +a && ./scripts/export-china-geo-pg.sh
#
# Output: exports/china_geo-YYYYMMDD-HHMMSS.dump (custom format, gzip-compressed inside pg_dump -Fc)

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT_DIR="${ROOT}/exports"
STAMP="$(date +%Y%m%d-%H%M%S)"
OUT_FILE="${OUT_DIR}/china_geo-${STAMP}.dump"

if ! command -v pg_dump >/dev/null 2>&1; then
  echo "pg_dump not found. Install PostgreSQL client tools, e.g. macOS: brew install libpq && brew link --force libpq" >&2
  exit 1
fi

if [[ -z "${CHINA_GEO_DATABASE_URL:-}" ]]; then
  echo "Set CHINA_GEO_DATABASE_URL to the Postgres connection URI from Supabase Database settings." >&2
  echo "See .env.example (CHINA_GEO_DATABASE_URL) and sql/init-china-geo.sql." >&2
  exit 1
fi

mkdir -p "${OUT_DIR}"

pg_dump "${CHINA_GEO_DATABASE_URL}" \
  -Fc \
  --no-owner \
  --no-acl \
  -f "${OUT_FILE}"

echo "Wrote ${OUT_FILE}"
echo "Restore to another Postgres: pg_restore --no-owner --no-acl -d TARGET_DB ${OUT_FILE}"
