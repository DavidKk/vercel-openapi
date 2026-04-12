#!/usr/bin/env node
/* eslint-disable no-console -- CLI script: print errors and dump path to stdout */
/**
 * Run pg_dump against CHINA_GEO_DATABASE_URL after resolving the hostname and appending hostaddr=
 * so libpq connects by IP while still using the hostname for TLS verification.
 *
 * Supabase "direct" host db.<ref>.supabase.co may have **only AAAA (IPv6)**, so IPv4-only lookup fails
 * with ENOTFOUND — use Dashboard → Database → **Connection pooling** → **Session** mode URI instead
 * (host aws-0-<region>.pooler.supabase.com:6543), which usually has IPv4.
 *
 * Environment:
 *   CHINA_GEO_DATABASE_URL — Postgres URI from Supabase (direct or Session pooler).
 *   CHINA_GEO_ALLOW_IPV6_DIRECT — set to "1" to attempt pg_dump via db.<ref>.supabase.co when only IPv6
 *   exists (most home networks in CN cannot reach it — use Session pooler URI instead).
 *
 * Requires: pg_dump on PATH (brew install libpq), Node 18+.
 */

import { spawnSync } from 'node:child_process'
import dns from 'node:dns/promises'
import { mkdirSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const raw = process.env.CHINA_GEO_DATABASE_URL
if (!raw || typeof raw !== 'string' || raw.trim() === '') {
  console.error('Set CHINA_GEO_DATABASE_URL to your Supabase Postgres URI (Dashboard → Database → Connection string → URI).')
  process.exit(1)
}

let u
try {
  u = new URL(raw.trim())
} catch {
  console.error('CHINA_GEO_DATABASE_URL is not a valid URL.')
  process.exit(1)
}

if (!u.hostname) {
  console.error('Missing host in CHINA_GEO_DATABASE_URL.')
  process.exit(1)
}

/** Prefer A record, then AAAA; return first address for hostaddr= */
async function resolveHostaddr(hostname) {
  try {
    const v4 = await dns.resolve4(hostname)
    if (v4?.length) return { addr: v4[0], kind: 'IPv4' }
  } catch {
    /* no A records */
  }
  try {
    const v6 = await dns.resolve6(hostname)
    if (v6?.length) return { addr: v6[0], kind: 'IPv6' }
  } catch {
    /* no AAAA */
  }
  return null
}

const resolved = await resolveHostaddr(u.hostname)
if (!resolved) {
  console.error(`DNS returned no A/AAAA records for ${u.hostname} (check network / VPN).`)
  process.exit(1)
}

const isDirectDbHost = /^db\.[^.]+\.supabase\.co$/i.test(u.hostname)
const isPoolerHost = u.hostname.includes('pooler.supabase.com')
const allowIpv6Direct = process.env.CHINA_GEO_ALLOW_IPV6_DIRECT === '1'

if (isDirectDbHost && !isPoolerHost && resolved.kind === 'IPv6' && !allowIpv6Direct) {
  console.error(`
Your URL uses direct host ${u.hostname}, which has no public IPv4 — only IPv6.
Many networks (especially in China) cannot reach that IPv6, so pg_dump will time out.

Fix: use the Session pooler connection string (usually has IPv4):
  1. Supabase Dashboard → Project Settings → Database
  2. Open "Connection string" → tab "Connection pooling" / "Pooler settings"
  3. Choose "Session mode" (needed for pg_dump), copy the full URI
  4. Username is often postgres.<project_ref> and host aws-0-<region>.pooler.supabase.com:6543

Example shape (password + region from your project):
  postgresql://postgres.pztdrpdgwweuetevarbc:PASSWORD@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres

Then:
  export CHINA_GEO_DATABASE_URL='...pasted URI...'
  pnpm run export:china-geo

To force trying direct IPv6 anyway: CHINA_GEO_ALLOW_IPV6_DIRECT=1 pnpm run export:china-geo
`)
  process.exit(1)
}

u.searchParams.set('hostaddr', resolved.addr)
if (!u.searchParams.has('sslmode')) {
  u.searchParams.set('sslmode', 'require')
}

const conn = u.toString()

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')
const outDir = path.join(root, 'exports')
mkdirSync(outDir, { recursive: true })

const d = new Date()
const pad = (n) => String(n).padStart(2, '0')
const stamp = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`
const outFile = path.join(outDir, `china_geo-${stamp}.dump`)

const r = spawnSync('pg_dump', [conn, '-Fc', '--no-owner', '--no-acl', '-f', outFile], { stdio: 'inherit', shell: false })

if (r.error) {
  console.error(r.error.message || r.error)
  console.error('Is pg_dump installed? brew install libpq && brew link --force libpq')
  process.exit(1)
}

if (r.status !== 0) {
  process.exit(r.status ?? 1)
}

console.log(`Wrote ${outFile}`)
console.log(`Using ${resolved.kind} ${resolved.addr} for host ${u.hostname} (hostaddr in URI)`)
console.log('Restore: pg_restore --no-owner --no-acl -d TARGET_DB ' + outFile)
