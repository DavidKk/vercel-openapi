# Active tasks

Tasks currently in progress. AI should read this to know what to implement. When a task is done, move it to `tasks/done/` or record in `tasks/done/README.md`.

---

### T-001: Public API semantics documented and wired into rules

- **Spec:** `.ai/specs/api-semantics.md` (done); `docs/specs/overview.md` (done).
- **Rules:** `.ai/rules/global.md` and `.ai/rules/layout/module-layout.md` must reference "public API = query latest credit/data" and point to the spec.
- **Done when:** Any "new API route" or "design public API" instruction leads to reading the spec; rules table has a row for it.

### T-002: Glossary and ADR in place

- **Knowledge:** `.ai/knowledge/glossary.md` defines Public API, Latest credit/data, Module. `docs/adr/0001-public-api-latest-only.md` records the decision.
- **Done when:** Glossary and ADR exist; `api-semantics.md` or `global.md` can link to them.

### T-003: (Optional) One module explicitly aligned to spec

- **Example:** Ensure Holiday (or another) module's API doc and response shape explicitly state "returns latest data only".
- **Done when:** At least one module's API page or spec snippet says so; no code change required if already correct.

---

## Template for new tasks

```markdown
### T-XXX: Short title

- **Spec / Plan:** link to doc(s).
- **Done when:** concrete, checkable criteria.
```
