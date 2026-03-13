/**
 * Update windows: UTC 04:00, 12:00, 20:00 (each 1h). Data valid 8h after update.
 */
export const UPDATE_WINDOWS = [4, 12, 20] as const
export const UPDATE_WINDOW_DURATION = 1
export const DATA_VALIDITY_DURATION = 8 * 60 * 60 * 1000

/** GIST file name for movies cache */
export const GIST_FILE_NAME = 'movies.json'

export const RESULT_CACHE_KEY = 'movies-cache:result'
