/** GIST file name for TASI daily cache (company + summary snapshot for compare). */
export const TASI_GIST_FILE_NAME = 'tasi-daily.json'

/** GIST snapshot TTL (ms). After this, snapshot is considered expired and we re-fetch from remote. Default 2h. */
export const TASI_GIST_TTL_MS = 2 * 60 * 60 * 1000

/** Max date range for K-line queries and DB retention (2 years). */
export const TASI_MAX_RANGE_DAYS = 365 * 2
