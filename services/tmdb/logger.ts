import { createLogger } from '@/services/logger'

/** Module logger for tmdb service; use this in index and any submodules to avoid circular imports */
export const logger = createLogger('tmdb')
