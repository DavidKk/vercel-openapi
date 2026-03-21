# Policy exceptions (approved overrides)

**Purpose:** Single place to list features that **override** default product rules (e.g. latest-only, no historical store, cache granularity). Each row is **approved**; the marker itself does **not** repeat the reason (reason is stated once in the audit / chat before approval).

**For AI:** To answer “what is marked / exempt?” — read this table and search the repo for `policy-exempt:`.

---

## Registry

| Tag                    | Scope                   | Note                                                   |
| ---------------------- | ----------------------- | ------------------------------------------------------ |
| `finance-tasi-history` | `/api/finance/tasi/...` | Historical / range queries + stored series (approved). |

_Add a row when the developer approves an exception; add the same tag inline in the relevant spec (see below)._

---

## Inline marker (required when registered)

In Markdown specs, place on the line **immediately above** the section or bullet the exception applies to:

```html
<!-- policy-exempt:<tag> -->
```

Example tag: `finance-tasi-history`. Same tag string as in the table **Tag** column.

**Do not** put the approval reason inside the HTML comment — only the tag. Reasons stay in the requirements audit / conversation before approval.

---

## When to add an entry

Default rules stay in `.ai/specs/api-semantics.md`. Anything **outside those defaults** (e.g. long-lived historical storage, sub-minute freshness guarantees, unbounded retention) needs **extra confirmation**: the developer states **why** in the audit thread; after **explicit approve**, add this table row + inline marker.
