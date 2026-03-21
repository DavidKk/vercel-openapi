# Module generator

Reads `.ai/rules` (layout, sidebar) and `.ai/schemas` (per-module content) and emits layout + pages. Use so generated code matches rules and stays consistent.

---

## Commands (repo root)

- **Generate one module (writes files):**  
  `pnpm run generate:module .ai/schemas/<id>.yaml`  
  Writes `app/<id>/layout.tsx`, `page.tsx`, `api/page.tsx`, `mcp/page.tsx`.
- **Validate schemas + generator:**  
  `pnpm run validate:ai`  
  Parses all `schemas/*.yaml`, runs `createModuleFromSchema` on **every** schema, and checks registry drift. Exit non-zero on failure. Optional: `SCHEMAS_DIR` for schema parsing/generator input; registry drift checks still use the canonical `.ai/specs/modules-registry.yaml` and `.ai/schemas/`.

---

## Entry (for agents or scripts)

- **createModuleFromSchema(schemaPath | schemaObject)** → `GeneratedFile[]`. From `.ai/generators/skill.ts`. Reads `.ai/rules/module-layout.yaml` by default.

---

## Files

- `tsconfig.json` — Generator only (Node); separate from Next.js.
- `cli.ts` — CLI entry (writes to disk).
- `validate.ts` — Validates all schema YAMLs, runs the generator for every schema, and includes registry drift checks.
- `loadRules.ts` — Loads `module-layout.yaml`.
- `loadSchema.ts` — Loads and normalizes a schema YAML.
- `createModule.ts` — Builds the four file contents from schema + layout rules.
- `skill.ts` — Exports `createModuleFromSchema`.
- `types.ts` — LayoutRules, ModuleSchema.
