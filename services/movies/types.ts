import type { MergedMovie } from '@/services/maoyan/types'

/**
 * Movies cache data structure (GIST JSON)
 */
export interface MoviesCacheData {
  data: {
    date: string
    timestamp: number
    movies: MergedMovie[]
    metadata: {
      totalCount: number
      description: string
    }
  }
  notifiedMovieIds: string[]
}
