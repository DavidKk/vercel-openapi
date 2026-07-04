import { jsonInvalidParameters } from '@/initializer/response'
import { tasiCompanyDailyListError } from '@/services/finance/tasi'

/**
 * Reject latest TASI company list requests when constituent feed is disabled (summary-only mode).
 * @param options Parsed company/daily query
 * @returns Invalid-parameters response or null when allowed
 */
export function tasiCompanyDailyListGuard(options: { date?: string; code?: string; from?: string; to?: string }) {
  const message = tasiCompanyDailyListError(options)
  if (message) return jsonInvalidParameters(message)
  return null
}

/**
 * Reject TASI company/daily/latest when constituent feed is disabled.
 * @returns Invalid-parameters response or null when allowed
 */
export function tasiCompanyDailyLatestGuard() {
  return tasiCompanyDailyListGuard({})
}
