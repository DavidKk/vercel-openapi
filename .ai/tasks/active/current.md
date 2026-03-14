# Active tasks

Tasks currently in progress. AI should read this to know what to implement. When a task is done, move it to `tasks/done/` or record in `tasks/done/README.md`.

---

### T-001: Public API semantics documented and wired into rules — **Done**

- **Spec:** `.ai/specs/api-semantics.md` (done); `docs/specs/overview.md` (done).
- **Rules:** `.ai/rules/global.md` and `.ai/rules/layout/module-layout.md` reference "public API = query latest credit/data" and point to the spec.
- **Done when:** Any "new API route" or "design public API" instruction leads to reading the spec; rules table has a row for it. See `tasks/done/README.md`.

### T-002: Glossary and ADR in place — **Done**

- **Knowledge:** `.ai/knowledge/glossary.md` defines Public API, Latest credit/data, Module. `docs/adr/0001-public-api-latest-only.md` records the decision.
- **Done when:** Glossary and ADR exist; `api-semantics.md` or `global.md` can link to them. See `tasks/done/README.md`.

### T-003: (Optional) One module explicitly aligned to spec — **Done**

- **Example:** Ensure Holiday (or another) module's API doc and response shape explicitly state "returns latest data only".
- **Done when:** At least one module's API page or spec snippet says so. DNS API page subtitle now includes "Returns latest resolution only (no history)". See `tasks/done/README.md`.

---

### T-DNS: DNS Query module — **Completed**

- **Spec:** [.ai/specs/modules/dns.md](../../specs/modules/dns.md)
- **Status:** T-DNS-1 through T-DNS-4 done. See [tasks/done/README.md](../done/README.md) for summary.

---

## Template for new tasks

```markdown
### T-XXX: Short title

- **Spec / Plan:** link to doc(s).
- **Done when:** concrete, checkable criteria.
```
