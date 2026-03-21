/**
 * KV client wrapper (Upstash Redis).
 *
 * The project uses `AUTH_KV_*` env vars locally, while Upstash uses
 * `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` naming convention.
 * We support both to avoid runtime crashes in development.
 */

import { Redis } from '@upstash/redis'

let client: Redis | null = null

/**
 * Get KV client singleton.
 *
 * @returns KV client or null when required env vars are not configured
 */
export function getKvClient(): Redis | null {
  if (client !== null) return client

  const url = process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL ?? process.env.AUTH_KV_REST_API_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN ?? process.env.AUTH_KV_REST_API_TOKEN

  if (!url || !token) return null

  client = new Redis({
    url,
    token,
  })
  return client
}

/**
 * Read a JSON value from KV.
 * Returns null on miss/unavailable/parse error.
 *
 * @param key KV key
 * @returns Parsed value or null
 */
export async function getJsonKv<T>(key: string): Promise<T | null> {
  const kv = getKvClient()
  if (!kv) return null

  try {
    const raw = await kv.get<unknown>(key)
    if (raw === null || raw === undefined) return null

    // Upstash SDK may return either a JSON string or an already-parsed value
    // depending on the stored type/value and SDK behavior.
    if (typeof raw === 'string') {
      return JSON.parse(raw) as T
    }

    return raw as T
  } catch {
    return null
  }
}

/**
 * Upsert a JSON value into KV.
 *
 * @param key KV key
 * @param value Serializable value
 */
export async function setJsonKv<T>(key: string, value: T): Promise<void> {
  const kv = getKvClient()
  if (!kv) return

  try {
    await kv.set(key, JSON.stringify(value))
  } catch {
    // ignore
  }
}

/**
 * Upsert JSON into KV with a TTL (seconds). No-op when KV is not configured.
 *
 * @param key KV key
 * @param value Serializable value
 * @param ttlSeconds Expiry in seconds (Upstash `EX`)
 */
export async function setJsonKvEx<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
  const kv = getKvClient()
  if (!kv) return

  const ex = Math.max(1, Math.floor(ttlSeconds))
  try {
    await kv.set(key, JSON.stringify(value), { ex })
  } catch {
    // ignore
  }
}
