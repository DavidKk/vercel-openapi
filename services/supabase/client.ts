import { createClient, type SupabaseClient } from '@supabase/supabase-js'

import { SUPABASE_CONNECTIONS } from './config'

/** Per-connection singleton cache. Key = connection id from config. */
const clientCache = new Map<string, SupabaseClient>()

/**
 * Get Supabase client for a named connection. Lazy-init singleton per connection.
 * Use connection ids from services/supabase/config (e.g. 'china-geo').
 *
 * @param connectionId Key in SUPABASE_CONNECTIONS (e.g. 'china-geo')
 * @returns SupabaseClient or null if env not configured for this connection
 */
export function getClient(connectionId: string): SupabaseClient | null {
  const cached = clientCache.get(connectionId)
  if (cached) {
    return cached
  }

  const config = SUPABASE_CONNECTIONS[connectionId]
  if (!config) {
    return null
  }

  const url = process.env[config.urlEnvKey]
  const key = (config.serviceRoleKeyEnvKey && process.env[config.serviceRoleKeyEnvKey]) ?? process.env[config.anonKeyEnvKey]
  if (!url || !key) {
    return null
  }

  const client = createClient(url, key)
  clientCache.set(connectionId, client)
  return client
}
