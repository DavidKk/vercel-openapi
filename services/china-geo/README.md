# china-geo

Reverse geocode (lat/lng → province/city/district) for mainland China via Supabase.

**Database setup:** Run `sql/init-china-geo.sql` in the Supabase SQL Editor once; see `sql/README.md` for steps and geom backfill after data import.

## Server vs browser

- **Server (API routes, actions, SSR)**  
  Import from `@/services/china-geo`.  
  Uses: Supabase RPC, in-memory LRU, Next.js cache. No browser APIs.

- **Browser (hooks, components)**  
  Import from `@/services/china-geo/browser` only.  
  Uses: IndexedDB (window). Do **not** import `browser/` in API routes or server code.

## Bbox from DB

The RPC `geo_containing_point_deepest` returns the real admin boundary bbox (`min_lng`, `min_lat`, `max_lng`, `max_lat`) from the deepest region’s `geom` (see `sql/init-china-geo.sql`). The API and client cache use this for point-in-region lookup; no synthetic bbox.

## Layout

| Path                                                         | Environment  | Purpose                          |
| ------------------------------------------------------------ | ------------ | -------------------------------- |
| `index.ts`, `cache.ts`, `client.ts`, `types.ts`, `logger.ts` | Server       | RPC, LRU cache, Supabase         |
| `browser/idb-cache.ts`, `browser/index.ts`                   | Browser only | IndexedDB cache for GET /api/geo |
