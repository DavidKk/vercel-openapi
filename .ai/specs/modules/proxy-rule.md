# Proxy rule module

## Scope

Clash-oriented proxy rules: load custom rules from the shared gist (`GIST_ID` / `GIST_TOKEN`), optionally merge ZeroOmega backup and gfwlist, expose merged RULE-SET compatible line prefixes for clients.

## Public API (read-only)

- **GET** `/api/proxy-rule/clash/config?type=<action>`
  - **type** (required): filter by clash rule action (e.g. `Proxy`, case-insensitive).
  - **Response:** standard envelope; `data.payload` is `string[]` (unique line prefixes without trailing action).

Semantics: read-only, reflects latest merged view from gist + optional sources (subject to upstream/cache behavior). Use GET for cacheable clients.

## Authenticated admin API

- **GET** `/api/proxy-rule/admin/clash` — current `rules` and `actions` from gist (session cookie).
- **POST** `/api/proxy-rule/admin/clash` — body `{ rules: ClashRule[] }` replaces rules in gist.

These routes are **not** covered by the “public data API” definition in `api-semantics.md`; they require login.

## Environment

- `GIST_ID`, `GIST_TOKEN` (required for merge + admin).
- `PROXY_RULE_CLASH_FILE` — optional gist file name (default `clash.unbnd.yaml`).
- `ZERO_OMEGA_GIST_ID`, `ZERO_OMEGA_GIST_TOKEN`, `ZERO_OMEGA_GIST_FILENAME` — optional ZeroOmega gist.
- `PROXY_RULE_FETCH_GFWLIST_IN_DEV` — set `1` to fetch gfwlist when `NODE_ENV=development`.

## MCP / Function Calling

- Tool: `get_clash_rule_config` — params `{ type: string }`.
