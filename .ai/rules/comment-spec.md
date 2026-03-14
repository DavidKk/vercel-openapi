# Comment and JSDoc convention

Use this when writing or reviewing comments and JSDoc. Code style (language, export form) stays in project `.cursorrules`; this rule covers **what to write in JSDoc when using TypeScript**.

---

## Principle: no duplicate types in JSDoc

The project uses **TypeScript**. Parameter and return **types** are already in the signature. Do **not** repeat them in JSDoc.

- **Do not** write `@param {string} name` or `@returns {boolean}` — the type is redundant.
- **Do** write a short description of meaning or behavior when it helps (e.g. "Latitude in decimal degrees", "True if the Nav should be hidden").

---

## What to include

| Element                   | Include in JSDoc? | Example                                                                                                                       |
| ------------------------- | ----------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| Function description      | Yes               | One line (or short block) describing what the function does.                                                                  |
| Parameter **type**        | No                | Omitted; use TS signature.                                                                                                    |
| Parameter **description** | Optional          | When the name is not self-explanatory or units/semantics matter (e.g. "in decimal degrees", "optional city to disambiguate"). |
| Return **type**           | No                | Omitted; use TS return type.                                                                                                  |
| Return **description**    | Optional          | When the return value meaning is not obvious from the type (e.g. "First location or null if outside China").                  |

---

## Examples

**Preferred (TS types only; JSDoc describes behavior):**

```ts
/** Whether the global Nav should be hidden for the current route (matches HIDDEN_ROUTES). */
export function useLayoutVisibility(): boolean { ... }

/** Reverse geocode a point. Returns null if not in mainland China or Supabase not configured. */
export async function reverseGeocode(latitude: number, longitude: number): Promise<GeoLocation | null> { ... }
```

**Avoid (redundant type in JSDoc):**

```ts
/** @returns {boolean} true if the Nav should be hidden, false otherwise */
export function useLayoutVisibility(): boolean { ... }
```

---

## Relation to .cursorrules

Project `.cursorrules` still require: English only, `/** */` format, and JSDoc on exported functions. This rule refines JSDoc content for TypeScript: describe meaning/behavior; omit `@param {Type}` and `@returns {Type}`.
