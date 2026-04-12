/**
 * TMDB environment helpers. Optional: API key required for merge; session not used in openapi.
 */

export function getTmdbApiKey(): string {
  const apiKey = process.env.TMDB_API_KEY
  if (!apiKey) {
    throw new Error('TMDB_API_KEY is not configured')
  }
  return apiKey
}

export function hasTmdbApiKey(): boolean {
  try {
    getTmdbApiKey()
    return true
  } catch {
    return false
  }
}

/**
 * Whether merged movie refresh should fetch TMDB popular/upcoming lists (when {@link hasTmdbApiKey} is true).
 * Defaults to enabled; set `MOVIES_TMDB_LISTS` to `0`, `false`, `no`, or `off` to skip TMDB list requests only.
 * @returns True when the key exists and lists are not explicitly disabled
 */
export function shouldIncludeTmdbMovieLists(): boolean {
  if (!hasTmdbApiKey()) return false
  const v = process.env.MOVIES_TMDB_LISTS?.trim().toLowerCase()
  if (v === '0' || v === 'false' || v === 'no' || v === 'off') return false
  return true
}
