# Specs index

Global: **api-semantics.md**. **Approved overrides (tags + registry):** [policy-exceptions.md](./policy-exceptions.md).

## Module list (single source of truth)

**For AI:** Treat [`modules-registry.yaml`](./modules-registry.yaml) as **mandatory** for every new `app/<id>/` module, but only **after** the request has passed **`workflow/requirements-audit.md`** and the developer has explicitly approved the scope. The YAML file header repeats this; **`INDEX.md`** and **`rules/global.md`** also point here.

**Authoritative list:** [`modules-registry.yaml`](./modules-registry.yaml) — each row has `id`, `title`, `spec` (path under `specs/` or `null`), and `schema` (path under `.ai/`). Keep `modules` **sorted by `id`**. After edits, run **`pnpm run validate:ai`** (or **`pnpm run validate:modules-registry`**) to verify paths and catch drift vs `app/<id>/layout.tsx` and `.ai/schemas/*.yaml`.

Per-module behavior: **modules/** (one file per module when `spec` is set; inherit anonymous read-only + latest credit/data from api-semantics unless the module documents auth writes or exceptions).

New module:

1. Run **`workflow/requirements-audit.md`** first and get explicit developer approval.
2. Add a row to **`modules-registry.yaml`** (insert in **sorted `id` order**; do not just append).
3. Add **`modules/<id>.md`** unless you intentionally set **`spec: null`** (use **`notes`**).
4. Add **`.ai/schemas/<id>.yaml`** and run the generator per **`schemas/README.md`**.
5. Run **`pnpm run validate:ai`**.

Do not override anonymous read-only + latest defaults unless the spec states an exception (`policy-exceptions.md`, `policy-exempt` marker, auth writes, or a distinct path such as `/api/holiday/history`). Module **id** in specs and schema is the route name (e.g. `geo`, not `china-geo`).

**AI quick path map:** **`.ai/INDEX.md`**.
