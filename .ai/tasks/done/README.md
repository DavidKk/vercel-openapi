# Done

Completed tasks. Move task entries or files here when done (or record in this file). Keeps `active/` focused on current work.

---

### T-DNS: DNS Query module (Plan B — minimal migration)

- **T-DNS-1** Schema + shell: `app/dns/` layout, page, api, mcp, skill, function-calling; Nav entry. Done.
- **T-DNS-2** DNS service + API route: `services/dns/`, GET `app/api/dns/route.ts` with L0 Cache-Control. Done.
- **T-DNS-3** Overview + Playground: `DnsQueryForm` (multi-result history, prev/next, L0 client cache, DNS endpoint autocomplete), API Playground. Done.
- **T-DNS-4** MCP / Function Calling / Skill: `dns_query` tool, FC page, skill-content. Done.

### T-001: Public API semantics documented and wired into rules

- `.ai/specs/api-semantics.md` and rules (global.md, module-layout.md) reference "public API = latest credit/data"; rules table has "Design or change public API behavior → api-semantics.md". Done.

### T-002: Glossary and ADR in place

- `.ai/knowledge/glossary.md` defines Public API, Latest credit/data, Module, etc.
- `docs/adr/0001-public-api-latest-only.md` records the decision (public API = latest only).
- `.ai/specs/api-semantics.md` references the ADR in References. Done.

### T-003: (Optional) One module explicitly aligned to spec

- At least one module's API page states "returns latest data only". DNS API page (`app/dns/api/page.tsx`) subtitle now includes "Returns latest resolution only (no history)". Done.
