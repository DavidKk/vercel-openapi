# DNS Query module (Spec)

Per-module spec for the DNS Query public API. Global convention: [api-semantics.md](../api-semantics.md) (anonymous read-only + latest credit/data; authenticated routes and policy exceptions per that spec).

---

## Purpose

- **Query DNS** for a given domain using a configurable DNS server (IP or DoH). Returns record sets (e.g. A, AAAA) in one response.
- **Scope:** Read-only lookup only. No custom headers, no HOSTS overlay, no auth — minimal “query DNS and return JSON” capability.
- **Default upstream:** When the user does not pass a DNS server, use `1.1.1.1` (or its DoH equivalent).

---

## Endpoints

| Method | Path       | Description                                                                    |
| ------ | ---------- | ------------------------------------------------------------------------------ |
| GET    | `/api/dns` | Query DNS by `domain` and optional `dns` (server). Returns records (L0 cache). |

---

## Request / response

### GET `/api/dns`

- **Query params:**
  - `domain` (required): Domain name to query (e.g. `example.com`).
  - `dns` (optional): DNS server. Supports:
    - **IP:** e.g. `1.1.1.1` — implementation maps to a known DoH endpoint where applicable, or uses DoH JSON resolve style if supported.
    - **DoH host:** e.g. `dns.google` or `cloudflare-dns.com` (no `https://` in param; implementation builds `https://${dns}/dns-query` or resolve URL).
  - Omitted `dns` → use default `1.1.1.1`.
- **Response (200):** JSON with all requested types in one payload, e.g.:
  - `{ records: Array<{ name, type, ttl, data }>, domain, dns? }`
  - Types returned in one go: at least A and AAAA (implementation may support more; no per-type round-trip required from the client).
- **Cache:** Support L0 (HTTP cache). Same `domain` + `dns` ⇒ same URL ⇒ cacheable. Use `Cache-Control` (e.g. `s-maxage`, `max-age`) on response.

---

## Errors and boundaries

- Missing or invalid `domain` → 400 with clear message.
- Invalid `dns` value (e.g. empty string after trim) → treat as “use default” or 400 per implementation choice.
- Upstream DNS failure or timeout → 502/503 or 200 with empty `records` and optional `error`; document actual behaviour in implementation.

---

## Semantics (latest only)

- Result is the **current** resolution from the chosen DNS server; no “as of date” or history.
- Read-only; no state change. No custom headers, no HOSTS, no auth for this endpoint.

---

## Overview page (UI)

- **Single form** with:
  - **DNS service endpoint** — input (optional; placeholder or default text for `1.1.1.1`).
  - **Domain** — input (required).
  - **Query** button — triggers GET `/api/dns?domain=...&dns=...` and displays `records` (and optional error).
- No extra options (no custom headers, no query-type selector if we always return A+AAAA in one go).
