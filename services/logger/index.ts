import { getTraceId } from '@/services/context'

/**
 * Minimal logger for server-side code. Uses console; can be replaced with a structured logger later.
 * Adds compact module prefix and per-request trace identifier when available.
 */

function buildPrefix(level: 'info' | 'warn' | 'fail', module?: string): string {
  const parts: string[] = []
  const traceId = getTraceId()

  // [type][module][traceId]
  parts.push(`[${level}]`)

  if (module) {
    parts.push(`[${module}]`)
  }

  if (traceId) {
    parts.push(`[${traceId}]`)
  }

  return parts.join('')
}

export interface ModuleLogger {
  info: (...args: unknown[]) => void
  warn: (...args: unknown[]) => void
  fail: (...args: unknown[]) => void
}

/**
 * Create a module-scoped logger that automatically prefixes logs with module name and traceId.
 * @param moduleName Name of the module or feature (e.g. "weather-api")
 * @returns Logger with info/warn/fail helpers bound to the module
 */
export function createLogger(moduleName: string): ModuleLogger {
  return {
    info: (...args: unknown[]) => {
      // eslint-disable-next-line no-console
      console.log(buildPrefix('info', moduleName), ...args)
    },
    warn: (...args: unknown[]) => {
      // eslint-disable-next-line no-console
      console.warn(buildPrefix('warn', moduleName), ...args)
    },
    fail: (...args: unknown[]) => {
      // eslint-disable-next-line no-console
      console.error(buildPrefix('fail', moduleName), ...args)
    },
  }
}
