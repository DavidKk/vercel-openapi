/**
 * Supabase connection config: connection id -> env var names.
 * Add a new entry for each Supabase project (china-geo, etc.).
 */

export interface SupabaseConnectionConfig {
  /** Env var for project URL (e.g. CHINA_GEO_SUPABASE_URL) */
  urlEnvKey: string
  /** Env var for anon key */
  anonKeyEnvKey: string
  /** Optional env var for service role key (takes precedence over anon if set) */
  serviceRoleKeyEnvKey?: string
}

/** Registry of named Supabase connections. Key = connection id used in getClient(id). */
export const SUPABASE_CONNECTIONS: Record<string, SupabaseConnectionConfig> = {
  'china-geo': {
    urlEnvKey: 'CHINA_GEO_SUPABASE_URL',
    anonKeyEnvKey: 'CHINA_GEO_SUPABASE_ANON_KEY',
    serviceRoleKeyEnvKey: 'CHINA_GEO_SUPABASE_SERVICE_ROLE_KEY',
  },
  // Add more connections here, e.g.:
  // 'other-app': { urlEnvKey: 'OTHER_SUPABASE_URL', anonKeyEnvKey: 'OTHER_SUPABASE_ANON_KEY' },
}
