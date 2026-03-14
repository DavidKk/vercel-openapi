/**
 * Shared Supabase client layer. One place for connection config and singleton per connection.
 * Register connections in config.ts; get a client with getClient(connectionId).
 */
export { getClient } from './client'
export { SUPABASE_CONNECTIONS, type SupabaseConnectionConfig } from './config'
