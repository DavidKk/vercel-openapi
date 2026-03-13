import type { MergedMovie } from '@/services/maoyan/types'

import { MovieHotStatus } from './types'

/** Maoyan wish thresholds (wish counts are typically higher than TMDB vote counts) */
const MAOYAN_WISH_HIGHLY_ANTICIPATED = 50000
const MAOYAN_WISH_AVERAGE = 10000
const MAOYAN_WISH_JUST_RELEASED_THRESHOLD = 10000
const MAOYAN_WISH_JUST_RELEASED_AVERAGE = 5000

const MAOYAN_SCORE_VERY_HOT = 8.0
const MAOYAN_SCORE_AVERAGE = 7.0

/** Scale: 100000 wish ≈ 50 popularity */
const MAOYAN_POPULARITY_NORMALIZATION_FACTOR = 2000
const MAOYAN_HOT_SCORE_VERY_HOT = 100
const MAOYAN_HOT_SCORE_AVERAGE = 50

function parseMaoyanScore(scoreString: string | undefined): number {
  if (!scoreString) return 0
  const score = parseFloat(scoreString)
  if (isNaN(score) || score < 0 || score > 10) return 0
  return score
}

/**
 * Judge movie hot status using Maoyan data (wish, score, sources).
 *
 * @param movie Merged movie with Maoyan fields
 * @param today Current date
 * @param releaseDate Parsed release date or null
 * @param isDateAfter Compare dates by date part only
 * @returns Movie hot status
 */
export function judgeMovieHotStatusWithMaoyan(movie: MergedMovie, today: Date, releaseDate: Date | null, isDateAfter: (date1: Date, date2: Date) => boolean): MovieHotStatus {
  const wish = movie.wish ?? 0
  const score = parseMaoyanScore(movie.score)
  const isMostExpected = movie.sources?.includes('mostExpected') ?? false
  const isTopRated = movie.sources?.includes('topRated') ?? false

  if (releaseDate && isDateAfter(releaseDate, today)) {
    if (isMostExpected && wish >= MAOYAN_WISH_HIGHLY_ANTICIPATED) return MovieHotStatus.HIGHLY_ANTICIPATED
    if (isMostExpected && wish >= MAOYAN_WISH_AVERAGE) return MovieHotStatus.AVERAGE
    if (wish >= MAOYAN_WISH_HIGHLY_ANTICIPATED) return MovieHotStatus.HIGHLY_ANTICIPATED
    if (wish >= MAOYAN_WISH_AVERAGE) return MovieHotStatus.AVERAGE
    return MovieHotStatus.NICHE
  }

  if (wish < MAOYAN_WISH_JUST_RELEASED_THRESHOLD) {
    if (isTopRated && score >= MAOYAN_SCORE_VERY_HOT) return MovieHotStatus.VERY_HOT
    if (isTopRated && score >= MAOYAN_SCORE_AVERAGE) return MovieHotStatus.AVERAGE
    if (wish >= MAOYAN_WISH_JUST_RELEASED_AVERAGE) return MovieHotStatus.AVERAGE
    return MovieHotStatus.NICHE
  }

  const normalizedPopularity = wish / MAOYAN_POPULARITY_NORMALIZATION_FACTOR
  const hotScore = normalizedPopularity + score * Math.log(wish / 1000 + 1)
  if (hotScore > MAOYAN_HOT_SCORE_VERY_HOT) return MovieHotStatus.VERY_HOT
  if (hotScore > MAOYAN_HOT_SCORE_AVERAGE) return MovieHotStatus.AVERAGE
  return MovieHotStatus.NICHE
}
