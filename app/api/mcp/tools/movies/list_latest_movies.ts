import { z } from 'zod'

import { tool } from '@/initializer/mcp'
import { getMoviesListWithTimestamp } from '@/services/movies'

/**
 * MCP tool: list latest movies from cache. Optional year filter (by release year).
 */
export const list_latest_movies = tool(
  'list_latest_movies',
  'List latest movies from cache (Maoyan + TMDB merge). Returns { movies, cachedAt }. Optional year filter.',
  z.object({
    year: z.number().int().min(2000).max(2100).optional().describe('Filter by release year (optional)'),
  }),
  async (params) => {
    const { movies, cachedAt } = await getMoviesListWithTimestamp()
    if (params.year != null) {
      const filtered = movies.filter((m) => {
        const y = m.year ?? (m.releaseDate ? parseInt(m.releaseDate.slice(0, 4), 10) : NaN)
        return !isNaN(y) && y === params.year
      })
      return { movies: filtered, cachedAt }
    }
    return { movies, cachedAt }
  }
)
