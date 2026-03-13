# Component structure

Place components by scope; all modules and pages must follow this. Same authority as `module-layout.md`.

## Placement by scope

- **Page-private:** Put in `components/` at that segment (e.g. `app/exchange-rate/components/`). Only that page/segment imports them.
- **Shared by children only:** Put in the **parent segment's** `components/` (e.g. shared by `app/fuel-price/api` and `app/fuel-price/mcp` → `app/fuel-price/components/`).
- **Global:** Keep in the root `components/` (e.g. `JsonViewer`, `Alert`, `Spinner`).

## Folder and entry

- One **entry** per `components/` folder: `index.ts` or `index.tsx` that re-exports public components.
- Import from the folder: `import { Foo } from './components'` or `import { Foo } from '@/app/.../components'`.
- For large or multi-component files, use a subfolder (e.g. `components/Foo/`) and expose one entry so the import path stays the same.

## Examples

- `app/login/components/Form.tsx` + `index.ts` → `app/login/page.tsx` uses `import { LoginForm } from './components'`.
- `app/exchange-rate/api/components/ExchangeRateApiPlayground.tsx` + `index.ts` → api page imports from `./components`.
- Root `components/JsonViewer.tsx` → any page can `import ... from '@/components/JsonViewer'`.
