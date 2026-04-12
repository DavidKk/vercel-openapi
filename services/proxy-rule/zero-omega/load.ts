import { createLogger } from '@/services/logger'

import type { ZeroOmega } from './types'

const logger = createLogger('proxy-rule-zero-omega')

/**
 * Load ZeroOmega JSON from a raw file URL when env is configured.
 * @returns Parsed JSON payload, or null when env is missing/invalid or fetch/parsing fails
 */
export async function loadZeroOmegaConfig(): Promise<ZeroOmega | null> {
  /**
   * Env contract: `ZERO_OMEGA_RULES_JSON_URL` is the raw JSON file URL (HTTPS).
   */
  const rawUrl = process.env.ZERO_OMEGA_RULES_JSON_URL?.trim()
  if (!rawUrl) {
    return null
  }
  if (!rawUrl.startsWith('http')) return null

  try {
    const res = await fetch(rawUrl)
    if (!res.ok) {
      logger.warn('loadZeroOmegaConfig fetch failed', { status: res.status, url: rawUrl })
      return null
    }
    const content = await res.text()
    return JSON.parse(content) as ZeroOmega
  } catch (error) {
    logger.warn('loadZeroOmegaConfig failed', { error })
    return null
  }
}
