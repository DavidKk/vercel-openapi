# Module schemas (YAML)

One YAML per module. Only **variable** content; layout and sidebar order come from `.ai/rules`. Generator reads these and produces `app/<id>/` files.

---

## Contract (for accurate generation)

**Fixed (do not change in schema):** Sidebar has 5 entries in order: overview, api, mcp, functionCalling, skill. See `.ai/rules/layout/module-layout.md`.

**You supply:** Fields below. Then call `createModuleFromSchema('.ai/schemas/<id>.yaml')` or run `pnpm run generate:module .ai/schemas/<id>.yaml`.

### Top-level required

| Field         | Type   | Meaning                                                  |
| ------------- | ------ | -------------------------------------------------------- |
| `id`          | string | Module ID and route name (e.g. `holiday`, `fuel-price`). |
| `name`        | string | Display name (e.g. `Holiday`, `Fuel Price`).             |
| `routePrefix` | string | Route prefix with leading `/` (e.g. `/holiday`).         |

### Top-level optional

| Field          | Type  | Meaning                                                                                                                                    |
| -------------- | ----- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `sidebarItems` | array | Override per-entry `title` / `ariaLabel` / `iconName`. Keys: `overview`, `api`, `mcp`, `functionCalling`, `skill`. Order must match rules. |

**Overview:** Overview page content is **not** generated from schema. Each module’s Overview is specific (calendar, table, form, etc.). The generator produces an empty placeholder. When adding a module, ask the developer how the Overview should be displayed; if they do not specify, leave it empty.

### apiPage (required)

| Field                     | Type   | Meaning                                                    |
| ------------------------- | ------ | ---------------------------------------------------------- |
| `title`                   | string | API doc title.                                             |
| `subtitle`                | string | Subtitle.                                                  |
| `endpoints`               | array  | List of `{ method, path, description, exampleResponse? }`. |
| `playgroundComponentName` | string | Playground component name.                                 |
| `playgroundImportPath`    | string | Playground component import path.                          |

### mcpPage (required)

| Field                     | Type   | Meaning                                              |
| ------------------------- | ------ | ---------------------------------------------------- |
| `title`                   | string | MCP doc title.                                       |
| `subtitle`                | string | Subtitle.                                            |
| `tools`                   | array  | List of `{ name, description, paramsDescription? }`. |
| `playgroundComponentName` | string | Playground component name.                           |
| `playgroundImportPath`    | string | Playground component import path.                    |

**YAML:** If a value contains `:` (e.g. `params: number`), wrap in quotes to avoid "Nested mappings are not allowed".

---

## Examples

Copy `holiday.yaml`, `fuel-price.yaml`, `exchange-rate.yaml`, or `geo.yaml`; change fields; run generator.
