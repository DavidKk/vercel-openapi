import { getClient } from '@/services/supabase'

/** Connection id for China GEO Supabase project (see services/supabase/config). */
const CHINA_GEO_CONNECTION_ID = 'china-geo'

/**
 * Get Supabase client for china_geo RPC. Uses shared supabase client layer (singleton per connection).
 * @returns SupabaseClient or null if env not configured
 */
export function getSupabase() {
  return getClient(CHINA_GEO_CONNECTION_ID)
}
