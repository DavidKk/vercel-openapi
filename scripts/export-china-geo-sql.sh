#!/usr/bin/env bash
set -euo pipefail

# Export china_geo Supabase Postgres to a plain SQL file using Supabase CLI (`supabase db dump`).
# Does not require pg_dump; requires `supabase` on PATH (e.g. brew install supabase/tap/supabase).
#
# Set CHINA_GEO_DATABASE_URL to the Postgres URI from:
#   Supabase Dashboard → Project Settings → Database → Connection string → URI
# If the password contains @ or other reserved characters, percent-encode it in the URL.
#
# Usage:
#   export CHINA_GEO_DATABASE_URL='postgresql://postgres.[ref]:PASSWORD@db....supabase.co:5432/postgres'
#   pnpm run export:china-geo:sql
#
# Or: set -a && source .env.local && set +a && pnpm run export:china-geo:sql

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT_DIR="${ROOT}/exports"
STAMP="$(date +%Y%m%d-%H%M%S)"
OUT_FILE="${OUT_DIR}/china_geo-${STAMP}.sql"

if ! command -v supabase >/dev/null 2>&1; then
  echo "supabase CLI not found. Install: brew install supabase/tap/supabase" >&2
  exit 1
fi

if [[ -z "${CHINA_GEO_DATABASE_URL:-}" ]]; then
  echo "Set CHINA_GEO_DATABASE_URL to your Supabase Postgres URI (Database → Connection string → URI)." >&2
  echo "This is not CHINA_GEO_SUPABASE_URL and not the anon key." >&2
  exit 1
fi

mkdir -p "${OUT_DIR}"

supabase db dump --db-url "${CHINA_GEO_DATABASE_URL}" -f "${OUT_FILE}"

echo "Wrote ${OUT_FILE}"
