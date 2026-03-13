/**
 * Minimal logger for server-side code. Uses console; can be replaced with a structured logger later.
 */

/**
 * Log info message
 * @param args Messages or objects to log
 */
export function info(...args: unknown[]) {
  // eslint-disable-next-line no-console
  console.log('[info]', ...args)
}

/**
 * Log warning message
 * @param args Messages or objects to log
 */
export function warn(...args: unknown[]) {
  // eslint-disable-next-line no-console
  console.warn('[warn]', ...args)
}

/**
 * Log error message (failure path)
 * @param args Messages or objects to log
 */
export function fail(...args: unknown[]) {
  // eslint-disable-next-line no-console
  console.error('[fail]', ...args)
}
