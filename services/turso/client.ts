/**
 * Turso (libsql) client for server cache. Edge-safe (HTTP).
 * Configure TURSO_DATABASE_URL and TURSO_AUTH_TOKEN to enable.
 */

import { type Client, createClient } from '@libsql/client'

let client: Client | null = null

/**
 * Get Turso client singleton. Returns null if env is not configured.
 *
 * @returns Turso Client or null
 */
export function getTursoClient(): Client | null {
  if (client !== null) return client
  const url = process.env.TURSO_DATABASE_URL
  const authToken = process.env.TURSO_AUTH_TOKEN
  if (!url || !authToken) return null
  client = createClient({ url, authToken })
  return client
}
