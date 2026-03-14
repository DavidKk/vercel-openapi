/**
 * Format JSON-serializable data for logging with optional field summarization.
 * Summarized fields show size/shape (e.g. string length, object key count, array length)
 * instead of full content. Edge-safe (no Node-only APIs).
 */

/** Options for summarization (which keys to replace with size/shape). */
export interface FormatJsonSummaryOptions {
  /** Max characters to show as preview for summarized strings. Default 0 (no preview). */
  stringPreviewLength?: number
}

const DEFAULT_SUMMARY_OPTIONS: Required<FormatJsonSummaryOptions> = {
  stringPreviewLength: 0,
}

/**
 * Build a summary placeholder for a value (string/object/array).
 *
 * @param value Value to summarize
 * @param stringPreviewLength If > 0, prefix string summary with a short preview
 * @returns Summary string like "[string, 1234 chars]" or "[object, 5 keys]"
 */
function summarizeValue(value: unknown, stringPreviewLength: number): string {
  if (typeof value === 'string') {
    const preview = stringPreviewLength > 0 && value.length > stringPreviewLength ? `${value.slice(0, stringPreviewLength)}... ` : ''
    return `${preview}[string, ${value.length} chars]`
  }
  if (Array.isArray(value)) {
    return `[array, ${value.length} items]`
  }
  if (value !== null && typeof value === 'object') {
    const keyCount = Object.keys(value).length
    return `[object, ${keyCount} keys]`
  }
  return String(value)
}

/**
 * Recursively clone data and replace values at specified keys with size summaries.
 * Only keys in keysToSummarize are summarized; others are cloned as-is.
 *
 * @param data JSON-serializable data (object, array, or primitive)
 * @param keysToSummarize Optional set of property names to summarize (e.g. ['polygon']). Omitted = no summarization.
 * @param options Optional format options (e.g. string preview length)
 * @returns New structure with summarized fields; primitives and non-matching keys unchanged
 */
export function formatJsonSummary(data: unknown, keysToSummarize?: string[], options?: FormatJsonSummaryOptions): unknown {
  const opts = { ...DEFAULT_SUMMARY_OPTIONS, ...options }
  const keySet = keysToSummarize == null ? null : new Set(keysToSummarize)

  function walk(value: unknown, key?: string): unknown {
    if (keySet !== null && key != null && keySet.has(key)) {
      return summarizeValue(value, opts.stringPreviewLength)
    }
    if (Array.isArray(value)) {
      return value.map((item, i) => walk(item, String(i)))
    }
    if (value !== null && typeof value === 'object' && Object.prototype.toString.call(value) === '[object Object]') {
      const obj = value as Record<string, unknown>
      const out: Record<string, unknown> = {}
      for (const k of Object.keys(obj)) {
        out[k] = walk(obj[k], k)
      }
      return out
    }
    return value
  }

  if (keySet === null) {
    return data
  }
  if (data !== null && typeof data === 'object' && !Array.isArray(data)) {
    const obj = data as Record<string, unknown>
    const out: Record<string, unknown> = {}
    for (const k of Object.keys(obj)) {
      out[k] = walk(obj[k], k)
    }
    return out
  }
  return data
}

/**
 * Summarize specified keys (size/shape only) then format as JSON string for logging.
 * Edge-safe; no Node-only APIs.
 *
 * @param data JSON-serializable data (object, array, or primitive)
 * @param keysToSummarize Optional property names to summarize (e.g. ['polygon']). Omitted = no key summarization.
 * @param options Optional: stringPreviewLength for summarized strings
 * @returns String ready for logger (e.g. logger.info('msg', formatJsonSummaryForLog(obj, ['polygon'])))
 */
export function formatJsonSummaryForLog(data: unknown, keysToSummarize?: string[], options?: FormatJsonSummaryOptions): string {
  const summarized = formatJsonSummary(data, keysToSummarize, options)
  try {
    return JSON.stringify(summarized, null, 2)
  } catch {
    return String(summarized)
  }
}
