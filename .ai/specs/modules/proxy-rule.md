# Proxy rule module

**Global convention:** [api-semantics.md](../api-semantics.md) defines anonymous read-only **public** data APIs. This module also exposes **session admin** routes; those are **not** covered by the public API definition in that spec (see **Authenticated admin API** below).

## Scope

Clash-oriented proxy rules: load custom rules from the KV cache, optionally merge ZeroOmega backup and gfwlist, expose merged RULE-SET compatible line prefixes for clients.

## Public API (read-only)

- **GET** `/api/proxy-rule/clash/config?type=<action>`
  - **type** (required): filter by clash rule action (e.g. `Proxy`, case-insensitive).
  - **Response:** standard envelope; `data.payload` is `string[]` (unique line prefixes without trailing action).

Semantics: read-only, reflects latest merged view from KV cache + optional sources (subject to upstream/cache behavior). Use GET for cacheable clients.

## Authenticated admin API

- **GET** `/api/proxy-rule/admin/clash` — current `rules` and `actions` from KV (session cookie).
- **POST** `/api/proxy-rule/admin/clash` — body `{ rules: ClashRule[] }` replaces rules in KV.

These routes are **not** covered by the “public data API” definition in `api-semantics.md`; they require login.

## Environment

- `PROXY_RULE_CLASH_FILE` — optional (legacy) clash YAML filename hint (default `clash.unbnd.yaml`).
- `ZERO_OMEGA_RULES_JSON_URL` — optional ZeroOmega raw JSON file URL (HTTPS; token/filename not required).
- `PROXY_RULE_FETCH_GFWLIST_IN_DEV` — set `1` to fetch gfwlist when `NODE_ENV=development`.

## MCP / Function Calling

- Tool: `get_clash_rule_config` — params `{ type: string }`.
